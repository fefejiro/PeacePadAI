import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { parse } from "url";
import { trackUsage } from "./softAuth";
import { sendPushNotification } from "./push-notifications";
import { storage } from "./storage";

interface Client {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  connectionId: string;
  callSessionCode?: string; // Track which call session the user is in
}

const clients = new Map<string, Client>();
const callSessions = new Map<string, Set<string>>(); // sessionCode -> Set of connectionIds

export function broadcastNewMessage() {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: "new-message" }));
    }
  });
}

export function notifyPartnershipJoin(userId: string, partnerName: string) {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ 
        type: "partnership-joined",
        partnerName: partnerName 
      }));
    }
  });
}

export function setupWebRTCSignaling(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url || "");
    
    if (pathname === "/ws/signaling") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket, request) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");

    if (!sessionId || !userId) {
      ws.close(1008, "Missing sessionId or userId");
      return;
    }

    // Use unique connection ID to allow multiple connections per user
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client: Client = { ws, sessionId, userId, connectionId };
    clients.set(connectionId, client);

    console.log(`WebRTC client connected: ${userId} (${connectionId})`);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, to, payload, sessionCode: msgSessionCode } = message;

        switch (type) {
          case "join-session":
            // User joins a call session
            const callSessionCode = payload.sessionCode;
            client.callSessionCode = callSessionCode;
            
            if (!callSessions.has(callSessionCode)) {
              callSessions.set(callSessionCode, new Set());
            }
            callSessions.get(callSessionCode)!.add(connectionId);
            
            console.log(`User ${userId} joined call session ${callSessionCode}`);
            
            // Notify all other users in the session
            const sessionClients = callSessions.get(callSessionCode);
            if (sessionClients) {
              sessionClients.forEach((clientId) => {
                const otherClient = clients.get(clientId);
                if (otherClient && otherClient.connectionId !== connectionId && otherClient.ws.readyState === WebSocket.OPEN) {
                  otherClient.ws.send(JSON.stringify({
                    type: "peer-joined",
                    from: userId,
                    payload: { userId },
                  }));
                }
              });
            }
            
            // Send list of existing users in session to the new joiner
            if (sessionClients) {
              const existingUsers = Array.from(sessionClients)
                .map(id => clients.get(id))
                .filter(c => c && c.connectionId !== connectionId)
                .map(c => ({ userId: c!.userId, connectionId: c!.connectionId }));
              
              ws.send(JSON.stringify({
                type: "session-users",
                payload: { users: existingUsers },
              }));
            }
            break;

          case "offer":
          case "answer":
          case "ice-candidate":
            // For session-based calls, send to specific user in the session
            if (to) {
              clients.forEach((client) => {
                if (client.userId === to && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type,
                    from: userId,
                    payload,
                  }));
                }
              });
            }
            break;

          case "call-start":
            await trackUsage(sessionId, "callsInitiated", 1);
            
            // Send to all connections of the recipient user (for direct calls)
            if (to) {
              clients.forEach((client) => {
                if (client.userId === to && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "incoming-call",
                    from: userId,
                    callType: payload.callType,
                  }));
                }
              });
              
              // Send push notification to recipient
              try {
                const caller = await storage.getUser(userId);
                const callerName = caller?.displayName || 'Someone';
                const callType = payload.callType === 'video' ? 'video' : 'audio';
                
                await sendPushNotification(to, {
                  title: 'Incoming Call',
                  body: `${callerName} is calling you (${callType} call)`,
                  data: {
                    type: 'incoming-call',
                    from: userId,
                    callType: payload.callType,
                  },
                });
              } catch (error) {
                console.error('Failed to send push notification:', error);
              }
            }
            break;

          case "call-end":
            // Send to all connections of the recipient user
            if (to) {
              clients.forEach((client) => {
                if (client.userId === to && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "call-ended",
                    from: userId,
                  }));
                }
              });
            }
            break;

          case "leave-session":
            // User leaves a call session
            if (client.callSessionCode) {
              const sessionClients = callSessions.get(client.callSessionCode);
              if (sessionClients) {
                sessionClients.delete(connectionId);
                
                // Notify others in session
                sessionClients.forEach((clientId) => {
                  const otherClient = clients.get(clientId);
                  if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
                    otherClient.ws.send(JSON.stringify({
                      type: "peer-left",
                      from: userId,
                    }));
                  }
                });
                
                // Clean up empty sessions
                if (sessionClients.size === 0) {
                  callSessions.delete(client.callSessionCode);
                }
              }
              client.callSessionCode = undefined;
            }
            break;

          case "ai-consent":
            // Broadcast AI listening consent status to all users in the same call session
            if (client.callSessionCode) {
              const sessionClients = callSessions.get(client.callSessionCode);
              if (sessionClients) {
                sessionClients.forEach((clientId) => {
                  const otherClient = clients.get(clientId);
                  // Send to all OTHER clients in the session (not the sender)
                  if (otherClient && otherClient.connectionId !== connectionId && otherClient.ws.readyState === WebSocket.OPEN) {
                    otherClient.ws.send(JSON.stringify({
                      type: "ai-consent",
                      from: userId,
                      payload: payload,
                    }));
                  }
                });
              }
            }
            break;

          default:
            console.log("Unknown message type:", type);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      // Clean up from call session if user was in one
      if (client.callSessionCode) {
        const sessionClients = callSessions.get(client.callSessionCode);
        if (sessionClients) {
          sessionClients.delete(connectionId);
          
          // Notify others in session
          sessionClients.forEach((clientId) => {
            const otherClient = clients.get(clientId);
            if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
              otherClient.ws.send(JSON.stringify({
                type: "peer-left",
                from: userId,
              }));
            }
          });
          
          // Clean up empty sessions
          if (sessionClients.size === 0) {
            callSessions.delete(client.callSessionCode);
          }
        }
      }
      
      clients.delete(connectionId);
      console.log(`WebRTC client disconnected: ${userId} (${connectionId})`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      
      // Clean up from call session if user was in one
      if (client.callSessionCode) {
        const sessionClients = callSessions.get(client.callSessionCode);
        if (sessionClients) {
          sessionClients.delete(connectionId);
          if (sessionClients.size === 0) {
            callSessions.delete(client.callSessionCode);
          }
        }
      }
      
      clients.delete(connectionId);
    });
  });

  console.log("WebRTC signaling server initialized");
}
