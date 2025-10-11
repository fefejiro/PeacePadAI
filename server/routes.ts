import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSoftAuth, isSoftAuthenticated, trackUsage } from "./softAuth";
import { insertMessageSchema, insertNoteSchema, insertTaskSchema, insertChildUpdateSchema, insertPetSchema, insertExpenseSchema, insertEventSchema, insertCallRecordingSchema, insertTherapistSchema, insertAuditLogSchema } from "@shared/schema";
import { setupWebRTCSignaling, broadcastNewMessage } from "./webrtc-signaling";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for call recordings
const uploadDir = path.join(process.cwd(), 'uploads', 'recordings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Configure multer for chat attachments
const chatAttachmentsDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(chatAttachmentsDir)) {
  fs.mkdirSync(chatAttachmentsDir, { recursive: true });
}

const chatUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const chatUpload = multer({ 
  storage: chatUploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for images, videos, documents
});

async function analyzeTone(content: string): Promise<{ 
  tone: string; 
  summary: string; 
  emoji: string; 
  rewordingSuggestion: string | null 
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an empathetic communication analyst for co-parents. Analyze messages carefully for emotional tone, paying special attention to hostile, offensive, vulgar, or aggressive language.

Tone classifications (choose the most appropriate):
- calm: Peaceful, supportive, constructive communication
- cooperative: Collaborative, solution-oriented, respectful
- neutral: Matter-of-fact, informational, neither positive nor negative
- frustrated: Irritated, impatient, but not hostile
- defensive: Self-protective, blame-shifting, dismissive
- hostile: Aggressive, attacking, offensive, vulgar, or containing curse words

IMPORTANT: Any message containing vulgar language, curse words, personal attacks, threats, or highly aggressive content MUST be classified as "hostile".

Provide:
1. Tone classification using one of the above categories
2. A brief 2-5 word emotional summary
3. An emoji: 😊 for calm, 🤝 for cooperative, 😐 for neutral, 😤 for frustrated, 🛡️ for defensive, 🚨 for hostile
4. If tone is frustrated, defensive, or hostile, ALWAYS provide a gentle rewording suggestion that promotes empathy and de-escalation. For calm/cooperative/neutral, say "none".`,
        },
        {
          role: "user",
          content: `Analyze this message: "${content}"
          
Respond in this exact format:
Tone: [calm/cooperative/neutral/frustrated/defensive/hostile]
Summary: [2-5 word description]
Emoji: [😊/🤝/😐/😤/🛡️/🚨]
Rewording: [suggestion or "none"]`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const result = response.choices[0]?.message?.content || "";
    const toneMatch = result.match(/Tone:\s*(\w+)/i);
    const summaryMatch = result.match(/Summary:\s*(.+)/i);
    const emojiMatch = result.match(/Emoji:\s*(.+)/i);
    const rewordingMatch = result.match(/Rewording:\s*(.+)/i);
    
    const tone = toneMatch?.[1]?.toLowerCase() || "neutral";
    const summary = summaryMatch?.[1]?.trim() || "Message sent";
    const emoji = emojiMatch?.[1]?.trim() || "😐";
    const rewording = rewordingMatch?.[1]?.trim();
    const rewordingSuggestion = rewording && rewording.toLowerCase() !== "none" ? rewording : null;
    
    return { tone, summary, emoji, rewordingSuggestion };
  } catch (error) {
    console.error("Error analyzing tone:", error);
    return { tone: "neutral", summary: "Analysis unavailable", emoji: "😐", rewordingSuggestion: null };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupSoftAuth(app);

  // Get current authenticated user
  app.get('/api/auth/user', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileImageUrl, displayName } = req.body;
      
      const updateData: any = {};
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (displayName !== undefined) updateData.displayName = displayName;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updateData,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Message routes
  app.get('/api/messages', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const messages = await storage.getMessagesByUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.user.sessionId;
      
      // Determine recipientId: use provided value or auto-select if only 2 users
      let recipientId = req.body.recipientId;
      
      if (!recipientId) {
        // Auto-select only if exactly 2 users total (1:1 co-parenting)
        const otherUsers = await storage.getOtherUsers(userId);
        if (otherUsers.length === 1) {
          recipientId = otherUsers[0].id;
        } else if (otherUsers.length === 0) {
          // No other users - message has no recipient (broadcast/note scenario)
          recipientId = null;
        } else {
          // Multiple users - require explicit recipient selection
          return res.status(400).json({ 
            message: "Multiple users found. Please specify recipientId to send message." 
          });
        }
      } else {
        // Validate provided recipientId exists and is not the sender
        if (recipientId === userId) {
          return res.status(400).json({ message: "Cannot send message to yourself" });
        }
        const recipient = await storage.getUser(recipientId);
        if (!recipient) {
          return res.status(400).json({ message: "Invalid recipient" });
        }
      }
      
      const parsed = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
        recipientId,
      });

      const { tone, summary, emoji, rewordingSuggestion} = await analyzeTone(parsed.content);
      
      const message = await storage.createMessage({
        ...parsed,
        tone,
        toneSummary: summary,
        toneEmoji: emoji,
        rewordingSuggestion,
      });

      // Track usage metrics
      await trackUsage(sessionId, 'messagesSent', 1);
      await trackUsage(sessionId, 'toneAnalyzed', 1);

      // Broadcast to all connected clients that a new message was posted
      broadcastNewMessage();

      res.json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: error.message || "Failed to create message" });
    }
  });

  // Chat attachments upload endpoint
  app.post('/api/chat-attachments', isSoftAuthenticated, chatUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/chat/${file.filename}`;
      const messageType = req.body.messageType || 'document'; // text, image, audio, video, document
      const duration = req.body.duration || null; // For audio/video
      
      // Return file information to be used when creating the message
      res.json({
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size.toString(),
        mimeType: file.mimetype,
        duration,
        messageType,
      });
    } catch (error: any) {
      console.error("Error uploading chat attachment:", error);
      res.status(400).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Note routes
  app.get('/api/notes', isSoftAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getNotes();
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post('/api/notes', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertNoteSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const note = await storage.createNote(parsed);
      res.json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(400).json({ message: error.message || "Failed to create note" });
    }
  });

  app.patch('/api/notes/:id', isSoftAuthenticated, async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(400).json({ message: "Failed to update note" });
    }
  });

  app.delete('/api/notes/:id', isSoftAuthenticated, async (req, res) => {
    try {
      await storage.deleteNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(400).json({ message: "Failed to delete note" });
    }
  });

  // Task routes
  app.get('/api/tasks', isSoftAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertTaskSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const task = await storage.createTask(parsed);
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message || "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isSoftAuthenticated, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isSoftAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: "Failed to delete task" });
    }
  });

  // Child update routes
  app.get('/api/child-updates', isSoftAuthenticated, async (req, res) => {
    try {
      const updates = await storage.getChildUpdates();
      res.json(updates);
    } catch (error) {
      console.error("Error fetching child updates:", error);
      res.status(500).json({ message: "Failed to fetch child updates" });
    }
  });

  app.post('/api/child-updates', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertChildUpdateSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const update = await storage.createChildUpdate(parsed);
      res.json(update);
    } catch (error: any) {
      console.error("Error creating child update:", error);
      res.status(400).json({ message: error.message || "Failed to create child update" });
    }
  });

  app.delete('/api/child-updates/:id', isSoftAuthenticated, async (req, res) => {
    try {
      await storage.deleteChildUpdate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child update:", error);
      res.status(400).json({ message: "Failed to delete child update" });
    }
  });

  // Pet routes
  app.get('/api/pets', isSoftAuthenticated, async (req, res) => {
    try {
      const pets = await storage.getPets();
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  app.post('/api/pets', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertPetSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const pet = await storage.createPet(parsed);
      res.json(pet);
    } catch (error: any) {
      console.error("Error creating pet:", error);
      res.status(400).json({ message: error.message || "Failed to create pet" });
    }
  });

  // Expense routes
  app.get('/api/expenses', isSoftAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertExpenseSchema.parse({
        ...req.body,
        paidBy: userId,
      });
      const expense = await storage.createExpense(parsed);
      res.json(expense);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(400).json({ message: error.message || "Failed to create expense" });
    }
  });

  // Therapist search endpoint
  app.get('/api/therapists/search', isSoftAuthenticated, async (req: any, res) => {
    try {
      const sessionId = req.user.sessionId;
      const postalCode = req.query.postalCode as string;
      
      if (!postalCode) {
        return res.status(400).json({ message: "Postal code required" });
      }

      // Track usage
      await trackUsage(sessionId, 'therapistSearches', 1);

      // Mock therapist data - in production, this would integrate with Google Places API or OpenStreetMap
      const mockTherapists = [
        {
          id: "1",
          name: "Dr. Sarah Johnson",
          type: "family therapist",
          address: `123 Main St, ${postalCode}`,
          phone: "(555) 123-4567",
          rating: 4.8,
          distance: "0.5 miles",
        },
        {
          id: "2",
          name: "Michael Chen, LMFT",
          type: "relationship counselor",
          address: `456 Oak Ave, ${postalCode}`,
          phone: "(555) 234-5678",
          rating: 4.9,
          distance: "1.2 miles",
        },
        {
          id: "3",
          name: "Dr. Emily Rodriguez",
          type: "co-parenting mediator",
          address: `789 Pine Rd, ${postalCode}`,
          phone: "(555) 345-6789",
          rating: 4.7,
          distance: "2.0 miles",
        },
      ];

      res.json(mockTherapists);
    } catch (error) {
      console.error("Error searching therapists:", error);
      res.status(500).json({ message: "Failed to search therapists" });
    }
  });

  // Event routes
  app.get('/api/events', isSoftAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertEventSchema.parse({
        ...req.body,
        createdBy: userId,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      const event = await storage.createEvent(parsed);
      res.json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message || "Failed to create event" });
    }
  });

  // AI conflict detection for events
  app.get('/api/events/analyze', isSoftAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEvents();
      const conflicts: string[] = [];
      const suggestions: string[] = [];

      // Check for overlapping events
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i];
          const event2 = events[j];
          const start1 = new Date(event1.startDate);
          const end1 = event1.endDate ? new Date(event1.endDate) : new Date(start1.getTime() + 60 * 60 * 1000);
          const start2 = new Date(event2.startDate);
          const end2 = event2.endDate ? new Date(event2.endDate) : new Date(start2.getTime() + 60 * 60 * 1000);

          if (start1 < end2 && start2 < end1) {
            conflicts.push(`"${event1.title}" overlaps with "${event2.title}" on ${start1.toLocaleDateString()}`);
          }
        }
      }

      // Use AI to analyze scheduling patterns
      if (events.length > 0) {
        try {
          const eventSummary = events.map(e => 
            `${e.type}: ${e.title} at ${new Date(e.startDate).toLocaleString()}`
          ).join('\n');

          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a co-parenting scheduling assistant. Analyze the schedule and identify potential conflicts or provide helpful suggestions for better coordination.",
              },
              {
                role: "user",
                content: `Analyze this co-parenting schedule:\n${eventSummary}\n\nProvide 1-3 brief suggestions for better coordination (max 50 words each).`,
              },
            ],
            temperature: 0.7,
            max_tokens: 150,
          });

          const aiSuggestions = response.choices[0]?.message?.content?.split('\n').filter(s => s.trim());
          if (aiSuggestions) {
            suggestions.push(...aiSuggestions.slice(0, 3));
          }
        } catch (error) {
          console.error("AI analysis error:", error);
          // Fallback suggestions if AI fails
          if (conflicts.length > 0) {
            suggestions.push("Consider adjusting overlapping events to avoid conflicts");
          }
        }
      }

      res.json({
        hasConflicts: conflicts.length > 0,
        conflicts,
        suggestions,
      });
    } catch (error) {
      console.error("Error analyzing events:", error);
      res.status(500).json({ message: "Failed to analyze events" });
    }
  });

  // Call session routes
  app.post('/api/call-sessions', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { callType } = req.body;
      
      // Validate call type
      const validCallTypes = ['audio', 'video'];
      const finalCallType = validCallTypes.includes(callType) ? callType : 'audio';
      
      // Generate a 6-digit session code with retry on collision
      let session;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          session = await storage.createCallSession({
            sessionCode,
            hostId: userId,
            callType: finalCallType,
          });
          
          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          if (error.code === '23505' && attempts < maxAttempts) {
            // Unique constraint violation, retry with new code
            continue;
          }
          throw error; // Re-throw if not a collision or max attempts reached
        }
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error creating call session:", error);
      res.status(500).json({ message: "Failed to create call session" });
    }
  });

  app.get('/api/call-sessions/:code', isSoftAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;
      const session = await storage.getCallSessionByCode(code);
      
      if (!session || !session.isActive) {
        return res.status(404).json({ message: "Call session not found or ended" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching call session:", error);
      res.status(500).json({ message: "Failed to fetch call session" });
    }
  });

  app.post('/api/call-sessions/:code/end', isSoftAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;
      await storage.endCallSession(code);
      res.json({ message: "Call ended successfully" });
    } catch (error) {
      console.error("Error ending call session:", error);
      res.status(500).json({ message: "Failed to end call session" });
    }
  });

  // Authenticated file serving for uploads
  app.get('/uploads/recordings/:filename', isSoftAuthenticated, (req: any, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    // Validate file exists and is within uploads directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(uploadDir)) {
      return res.status(404).json({ message: "File not found" });
    }
    
    res.sendFile(filePath);
  });

  // Call recording routes
  app.post('/api/call-recordings', isSoftAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const recordingUrl = `/uploads/recordings/${file.filename}`;
      const sessionCode = req.body.sessionCode || `recording-${Date.now()}`;
      
      // Create or find call session
      let sessionId = sessionCode;
      try {
        const existingSession = await storage.getCallSessionByCode(sessionCode);
        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          // Create a new session for this recording
          const newSession = await storage.createCallSession({
            sessionCode: sessionCode,
            hostId: userId,
            callType: req.body.recordingType || 'video',
          });
          sessionId = newSession.id;
        }
      } catch {
        // If session operations fail, use sessionCode as sessionId
        sessionId = sessionCode;
      }
      
      const parsed = insertCallRecordingSchema.parse({
        sessionId,
        recordingUrl,
        recordingType: req.body.recordingType || 'video',
        duration: req.body.duration?.toString() || '0',
        participants: [userId],
        recordedBy: userId,
      });
      
      const recording = await storage.createCallRecording(parsed);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        actionType: 'call_recording',
        resourceId: recording.id,
        resourceType: 'recording',
        details: { sessionId: recording.sessionId },
      });
      
      res.json(recording);
    } catch (error: any) {
      console.error("Error creating call recording:", error);
      res.status(400).json({ message: error.message || "Failed to create call recording" });
    }
  });

  app.get('/api/call-recordings', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recordings = await storage.getCallRecordings(userId);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching call recordings:", error);
      res.status(500).json({ message: "Failed to fetch call recordings" });
    }
  });

  // Geocoding route - convert address/postal code to coordinates
  app.get('/api/geocode', isSoftAuthenticated, async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }
      
      // Use OpenStreetMap Nominatim for free geocoding with addressdetails
      let nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address as string)}&format=json&addressdetails=1&limit=1`;
      let response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'PeacePad-CoParenting-App'
        }
      });
      
      let data = await response.json();
      
      // Fallback: If postal code search fails, try searching for just the city
      // This handles Canadian postal codes which Nominatim doesn't have detailed coverage for
      if ((!data || data.length === 0) && /[A-Za-z]\d[A-Za-z][\s\-]?\d[A-Za-z]\d/.test(address as string)) {
        // Try "Toronto, Ontario, Canada" as fallback for Canadian postal codes
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=Toronto,Ontario,Canada&format=json&addressdetails=1&limit=1`;
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'PeacePad-CoParenting-App'
          }
        });
        data = await fallbackResponse.json();
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const countryCode = data[0].address?.country_code;
      const isCanada = countryCode === 'ca';
      
      res.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        isCanada
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  // Haversine formula for accurate distance calculation in km
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Therapist directory routes - web search based
  app.get('/api/therapists', isSoftAuthenticated, async (req, res) => {
    try {
      const { lat, lng, maxDistance, address } = req.query;
      
      if (!lat || !lng) {
        return res.json([]);
      }
      
      // Determine location name for search
      let locationName = address as string || 'location';
      const distanceNum = parseInt(maxDistance as string || '50');
      
      // Create hardcoded therapist data based on web search results for Toronto area
      // In a production app, you would integrate with Psychology Today API or similar
      const therapistData = [
        {
          id: '1',
          name: 'KMA Therapy',
          specialty: 'Individual, Couples & Family Counseling',
          address: 'Multiple Locations: Yonge & Eglinton, King West, Yorkville, Liberty Village, Toronto',
          latitude: '43.7015',
          longitude: '-79.3984',
          phone: 'Contact via website',
          email: null,
          website: 'https://www.kmatherapy.com/',
          rating: 4.8,
          distance: 5,
          acceptsInsurance: true,
          licenseNumber: 'College of Psychologists of Ontario',
        },
        {
          id: '2',
          name: 'Nuvista Mental Health',
          specialty: 'Anxiety, Depression, Family & Veterans Services',
          address: 'Near Islington Subway, Etobicoke, Toronto',
          latitude: '43.6467',
          longitude: '-79.5247',
          phone: 'Free 20-min consultation',
          email: null,
          website: 'https://nuvistamentalhealth.com/',
          rating: 4.7,
          distance: 3,
          acceptsInsurance: true,
          licenseNumber: 'College of Psychologists of Ontario',
        },
        {
          id: '3',
          name: 'HealthOne Mental Health',
          specialty: 'Stress, Anxiety, Depression, Relationships, LGBTQ+ Care',
          address: 'Toronto, Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: null,
          email: null,
          website: 'https://healthone.ca/toronto/mental-health-therapy-to/',
          rating: 4.6,
          distance: 8,
          acceptsInsurance: true,
          licenseNumber: 'Registered Psychotherapists (6+ years experience)',
        },
        {
          id: '4',
          name: 'The Therapy Centre',
          specialty: 'Family, Child, Teen, Adult, Couples (CBT, DBT)',
          address: '1849 Yonge St, Toronto',
          latitude: '43.7022',
          longitude: '-79.3976',
          phone: null,
          email: null,
          website: 'https://thetherapycentre.ca/family-therapy-toronto/',
          rating: 4.8,
          distance: 10,
          acceptsInsurance: true,
          licenseNumber: 'Licensed Therapists',
        },
        {
          id: '5',
          name: 'Toronto Family Therapy & Mediation',
          specialty: 'Family, Child, Separation/Divorce Counseling',
          address: 'Toronto, Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: null,
          email: null,
          website: 'https://torontofamilytherapist.com/',
          rating: 4.9,
          distance: 7,
          acceptsInsurance: true,
          licenseNumber: 'Joanna Seidel, MSW, RSW, Acc.FM',
        },
        {
          id: '6',
          name: 'Marriage & Family Therapy Toronto',
          specialty: 'Couples, Families, Individual Psychotherapy',
          address: 'Bloor West Village, serves Etobicoke & Mississauga',
          latitude: '43.6510',
          longitude: '-79.4746',
          phone: null,
          email: null,
          website: 'https://www.mfttoronto.ca/',
          rating: 4.7,
          distance: 4,
          acceptsInsurance: true,
          licenseNumber: 'Registered Therapists, Sliding Scale Rates',
        },
        {
          id: '7',
          name: 'Family Service Toronto',
          specialty: 'Individual, Couples, Family Counseling (Sliding Scale)',
          address: 'Toronto, Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: 'Mon-Fri 9am-6pm',
          email: null,
          website: 'https://familyservicetoronto.org/',
          rating: 4.5,
          distance: 8,
          acceptsInsurance: true,
          licenseNumber: 'Free & Low-Cost Options Available',
        },
        {
          id: '8',
          name: 'The Mindfulness Clinic',
          specialty: 'Mindfulness-Based Therapy, CBT, Anxiety, Depression, Addiction',
          address: 'Online/Phone across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: null,
          email: null,
          website: 'https://themindfulnessclinic.ca/',
          rating: 4.6,
          distance: 0,
          acceptsInsurance: true,
          licenseNumber: 'Multilingual (English, Russian, Farsi, Hindi, Urdu)',
        },
      ];
      
      // Calculate actual distances using haversine formula
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      
      const therapistsWithDistance = therapistData.map(therapist => ({
        ...therapist,
        distance: Math.round(calculateDistance(
          userLat,
          userLng,
          parseFloat(therapist.latitude),
          parseFloat(therapist.longitude)
        ))
      }));
      
      // Filter by distance and sort
      const filteredTherapists = therapistsWithDistance.filter(
        t => t.distance <= distanceNum
      ).sort((a, b) => a.distance - b.distance);
      
      res.json(filteredTherapists);
    } catch (error) {
      console.error("Error fetching therapists:", error);
      res.status(500).json({ message: "Failed to fetch therapists" });
    }
  });

  app.post('/api/therapists', isSoftAuthenticated, async (req, res) => {
    try {
      const parsed = insertTherapistSchema.parse(req.body);
      const therapist = await storage.createTherapist(parsed);
      res.json(therapist);
    } catch (error: any) {
      console.error("Error creating therapist:", error);
      res.status(400).json({ message: error.message || "Failed to create therapist" });
    }
  });

  // Audit log and export routes
  app.get('/api/audit-trail', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate, format } = req.query;
      
      const auditTrail = await storage.getUserAuditTrail(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      // Create audit log for export
      await storage.createAuditLog({
        userId,
        actionType: 'export',
        resourceType: 'audit_trail',
        details: { format, itemCount: auditTrail.summary.totalMessages + auditTrail.summary.totalEvents + auditTrail.summary.totalCalls },
      });
      
      // If format is CSV or PDF, convert the data
      if (format === 'json') {
        res.json(auditTrail);
      } else if (format === 'csv') {
        // Generate CSV
        let csv = 'Type,Content,Date,Details\n';
        
        auditTrail.messages.forEach((m: any) => {
          csv += `Message,"${m.content}",${m.timestamp},"Tone: ${m.tone || 'N/A'}"\n`;
        });
        
        auditTrail.events.forEach((e: any) => {
          csv += `Event,"${e.title}",${e.startDate},"Type: ${e.type}"\n`;
        });
        
        auditTrail.calls.forEach((c: any) => {
          csv += `Call,"${c.callType} call",${c.createdAt},"Code: ${c.sessionCode}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.csv"');
        res.send(csv);
      } else {
        res.json(auditTrail);
      }
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.get('/api/audit-logs', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const logs = await storage.getAuditLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebRTC signaling server
  setupWebRTCSignaling(httpServer);
  
  return httpServer;
}
