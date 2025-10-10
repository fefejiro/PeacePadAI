import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { parse } from "url";
import { trackUsage } from "./softAuth";

interface Client {
  ws: WebSocket;
  sessionId: string;
  userId: string;
}

const clients = new Map<string, Client>();

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

    const client: Client = { ws, sessionId, userId };
    clients.set(userId, client);

    console.log(`WebRTC client connected: ${userId}`);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, to, payload } = message;

        switch (type) {
          case "offer":
          case "answer":
          case "ice-candidate":
            const recipient = clients.get(to);
            if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
              recipient.ws.send(JSON.stringify({
                type,
                from: userId,
                payload,
              }));
            }
            break;

          case "call-start":
            await trackUsage(sessionId, "callsInitiated", 1);
            const callRecipient = clients.get(to);
            if (callRecipient && callRecipient.ws.readyState === WebSocket.OPEN) {
              callRecipient.ws.send(JSON.stringify({
                type: "incoming-call",
                from: userId,
                callType: payload.callType,
              }));
            }
            break;

          case "call-end":
            const endRecipient = clients.get(to);
            if (endRecipient && endRecipient.ws.readyState === WebSocket.OPEN) {
              endRecipient.ws.send(JSON.stringify({
                type: "call-ended",
                from: userId,
              }));
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
      clients.delete(userId);
      console.log(`WebRTC client disconnected: ${userId}`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(userId);
    });
  });

  console.log("WebRTC signaling server initialized");
}
