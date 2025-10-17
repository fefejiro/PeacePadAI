import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSoftAuth, isSoftAuthenticated, trackUsage } from "./softAuth";
import { insertMessageSchema, insertNoteSchema, insertTaskSchema, insertChildUpdateSchema, insertPetSchema, insertExpenseSchema, insertEventSchema, insertCallRecordingSchema, insertTherapistSchema, insertAuditLogSchema } from "@shared/schema";
import { setupWebRTCSignaling, broadcastNewMessage, notifyPartnershipJoin } from "./webrtc-signaling";
import OpenAI from "openai";
import { transcribeFromBase64 } from "./whisperService";
import { analyzeEmotion, generateSessionSummary } from "./emotionAnalyzer";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, mockToneAnalysis, createCacheKey } from "./aiHelper";
import multer from "multer";
import path from "path";
import fs from "fs";

// Using Replit AI Integrations for OpenAI access (no API key needed, billed to Replit credits)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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

// Configure multer for expense receipts
const receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const receiptUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const receiptUpload = multer({ 
  storage: receiptUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for receipts (images/PDFs)
});

// Configure multer for profile photos
const profilePhotosDir = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

const profileUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const profileUpload = multer({ 
  storage: profileUploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile photos
});

async function analyzeTone(content: string): Promise<{ 
  tone: string; 
  summary: string; 
  emoji: string; 
  rewordingSuggestion: string | null 
}> {
  // Dev mode protection - return mock response to avoid token usage
  if (isDevMode()) {
    return mockToneAnalysis(content);
  }

  // Check cache first to reduce duplicate API calls
  const cacheKey = createCacheKey('tone', content);
  const cached = aiCache.get<{ tone: string; summary: string; emoji: string; rewordingSuggestion: string | null }>(cacheKey);
  
  if (cached) {
    logTokenUsage('analyzeTone', 150, true);
    return cached;
  }

  try {
    const maxTokens = getMaxTokens(150);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using improved model via Replit AI integration
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
      max_tokens: maxTokens,
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
    
    const resultData = { tone, summary, emoji, rewordingSuggestion };
    
    // Cache the result
    aiCache.set(cacheKey, resultData);
    logTokenUsage('analyzeTone', maxTokens, false);
    
    return resultData;
  } catch (error) {
    console.error("Error analyzing tone with Replit AI:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Full error details:", errorMessage);
    return { tone: "neutral", summary: "AI analysis unavailable", emoji: "😐", rewordingSuggestion: null };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupSoftAuth(app);

  // Get current authenticated user
  app.get('/api/auth/user', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let user = await storage.getUser(userId);
      
      // Ensure user has an invite code (for legacy users)
      if (user && !user.inviteCode) {
        const newCode = await storage.generateInviteCode();
        user = await storage.upsertUser({
          ...user,
          inviteCode: newCode,
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all users (for contact selection) - phone numbers excluded for privacy
  app.get('/api/users', isSoftAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Return only basic user info for privacy - NO phone numbers to non-contacts
      const basicUserInfo = users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        profileImageUrl: u.profileImageUrl,
      }));
      res.json(basicUserInfo);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileImageUrl, displayName, phoneNumber, sharePhoneWithContacts, childName, relationshipType } = req.body;
      
      const updateData: any = {};
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (sharePhoneWithContacts !== undefined) updateData.sharePhoneWithContacts = sharePhoneWithContacts;
      if (childName !== undefined) updateData.childName = childName;
      if (relationshipType !== undefined) updateData.relationshipType = relationshipType;
      
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
      const { recipientId } = req.query;
      
      // Get all messages for the user
      let messages = await storage.getMessagesByUser(userId);
      
      // Filter by recipient if provided (for partnership-specific conversations)
      if (recipientId && typeof recipientId === 'string') {
        messages = messages.filter(msg => 
          (msg.senderId === userId && msg.recipientId === recipientId) ||
          (msg.senderId === recipientId && msg.recipientId === userId)
        );
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Preview tone analysis without sending (AI-first feature)
  app.post('/api/messages/preview', isSoftAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const { tone, summary, emoji, rewordingSuggestion } = await analyzeTone(content);
      
      res.json({ 
        tone, 
        summary, 
        emoji, 
        rewordingSuggestion,
        originalMessage: content
      });
    } catch (error) {
      console.error("Error previewing tone:", error);
      res.status(500).json({ message: "Failed to analyze message tone" });
    }
  });

  app.post('/api/messages', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.user.sessionId;
      
      // Determine recipientId: use provided value or auto-select
      let recipientId = req.body.recipientId;
      
      if (!recipientId) {
        const otherUsers = await storage.getOtherUsers(userId);
        if (otherUsers.length === 0) {
          // No other users - message to yourself (WhatsApp-like solo chat)
          recipientId = userId;
        } else {
          // Auto-select most recent other user for co-parenting demo
          recipientId = otherUsers[0].id;
        }
      } else {
        // Validate provided recipientId exists (allow self-messaging)
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

  // Receipt upload endpoint for expenses
  app.post('/api/receipt-upload', isSoftAuthenticated, receiptUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/receipts/${file.filename}`;
      
      // Return file information to be used when creating the expense
      res.json({
        receiptUrl: fileUrl,
        fileName: file.originalname,
        fileSize: file.size.toString(),
      });
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      res.status(400).json({ message: error.message || "Failed to upload receipt" });
    }
  });

  // Profile photo upload endpoint
  app.post('/api/profile-upload', isSoftAuthenticated, profileUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Validate file type (images only)
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      
      const profileImageUrl = `/uploads/profiles/${file.filename}`;
      
      res.json({
        profileImageUrl,
        fileName: file.originalname,
        fileSize: file.size.toString(),
      });
    } catch (error: any) {
      console.error("Error uploading profile photo:", error);
      res.status(400).json({ message: error.message || "Failed to upload profile photo" });
    }
  });

  // Partnership routes
  app.get('/api/partnerships', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const partnerships = await storage.getPartnerships(userId);
      
      // Fetch co-parent info for each partnership
      const partnershipsWithUsers = await Promise.all(
        partnerships.map(async (p) => {
          const coParentId = p.user1Id === userId ? p.user2Id : p.user1Id;
          const coParent = await storage.getUser(coParentId);
          return {
            ...p,
            coParent: coParent ? {
              id: coParent.id,
              displayName: coParent.displayName,
              profileImageUrl: coParent.profileImageUrl,
              phoneNumber: coParent.sharePhoneWithContacts ? coParent.phoneNumber : null,
            } : null,
          };
        })
      );
      
      res.json(partnershipsWithUsers);
    } catch (error) {
      console.error("Error fetching partnerships:", error);
      res.status(500).json({ message: "Failed to fetch partnerships" });
    }
  });

  app.post('/api/partnerships/join', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inviteCode } = req.body;

      if (!inviteCode || inviteCode.length !== 6) {
        return res.status(400).json({ message: "Invalid invite code" });
      }

      // Find user with this invite code
      const coParent = await storage.getUserByInviteCode(inviteCode);
      
      if (!coParent) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      if (coParent.id === userId) {
        return res.status(400).json({ message: "You cannot partner with yourself" });
      }

      // Check if partnership already exists
      const existingPartnerships = await storage.getPartnerships(userId);
      const alreadyPartnered = existingPartnerships.some(
        p => p.user1Id === coParent.id || p.user2Id === coParent.id
      );

      if (alreadyPartnered) {
        return res.status(400).json({ message: "Partnership already exists" });
      }

      // Create partnership
      const partnership = await storage.createPartnership({
        user1Id: userId,
        user2Id: coParent.id,
        inviteCode: inviteCode,
        allowAudio: true,
        allowVideo: true,
        allowRecording: false,
        allowAiTone: true,
      });

      // Get current user info for notification
      const currentUser = await storage.getUser(userId);
      
      // Notify the co-parent that someone joined using their code
      if (currentUser) {
        notifyPartnershipJoin(coParent.id, currentUser.displayName || 'Someone');
      }

      res.json({
        ...partnership,
        coParent: {
          id: coParent.id,
          displayName: coParent.displayName,
          profileImageUrl: coParent.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error joining partnership:", error);
      res.status(500).json({ message: "Failed to join partnership" });
    }
  });

  app.post('/api/partnerships/regenerate-code', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const newCode = await storage.regenerateInviteCode(userId);
      res.json({ inviteCode: newCode });
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  // Note routes
  app.get('/api/notes', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notes = await storage.getNotes(userId);
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
  app.get('/api/tasks', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tasks = await storage.getTasks(userId);
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
  app.get('/api/child-updates', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updates = await storage.getChildUpdates(userId);
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
  app.get('/api/pets', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pets = await storage.getPets(userId);
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
  app.get('/api/expenses', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const expenses = await storage.getExpenses(userId);
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
  app.get('/api/events', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const events = await storage.getEvents(userId);
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
  app.get('/api/events/analyze', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const events = await storage.getEvents(userId);
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

  // Public endpoint - no auth required to view session details
  app.get('/api/call-sessions/:code', async (req, res) => {
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

  // Push notification routes
  app.get('/api/push/vapid-public-key', (req, res) => {
    const { getVapidPublicKey } = require('./push-notifications');
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post('/api/push/subscribe', isSoftAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      res.json({ success: true, subscription });
    } catch (error: any) {
      // Handle duplicate endpoint error
      if (error.code === '23505') {
        return res.json({ success: true, message: "Already subscribed" });
      }
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  app.delete('/api/push/unsubscribe', isSoftAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: "Failed to delete push subscription" });
    }
  });

  // Geocoding route - convert address/postal code to coordinates
  app.get('/api/geocode', isSoftAuthenticated, async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }
      
      const addressStr = address as string;
      let data: any = null;
      let isCanada = false;
      
      // Check if it's a Canadian postal code (full format: A1A 1A1 or A1A1A1, partial: A1A)
      const canadianPostalFullRegex = /^[A-Za-z]\d[A-Za-z][\s\-]?\d[A-Za-z]\d$/;
      const canadianPostalPartialRegex = /^[A-Za-z]\d[A-Za-z]$/;
      
      if (canadianPostalFullRegex.test(addressStr.trim())) {
        // Use Geocoder.ca for full Canadian postal codes (more accurate)
        const postalCode = addressStr.replace(/\s/g, '').toUpperCase();
        try {
          const geocoderUrl = `https://geocoder.ca/?postal=${postalCode}&geoit=XML&json=1`;
          const response = await fetch(geocoderUrl);
          const geocoderData = await response.json();
          
          if (geocoderData && geocoderData.latt && geocoderData.longt) {
            isCanada = true;
            return res.json({
              lat: parseFloat(geocoderData.latt),
              lng: parseFloat(geocoderData.longt),
              displayName: `${postalCode}, ${geocoderData.standard?.city || ''}, ${geocoderData.standard?.prov || 'ON'}, Canada`,
              isCanada: true
            });
          }
        } catch (geocoderError) {
          console.log("Geocoder.ca failed, falling back to Nominatim:", geocoderError);
        }
      } else if (canadianPostalPartialRegex.test(addressStr.trim())) {
        // Handle partial Canadian postal code (first 3 characters like "L1N")
        const partialPostalCode = addressStr.replace(/\s/g, '').toUpperCase();
        
        // Common FSA (Forward Sortation Area) to approximate coordinates mapping
        // First letter indicates province, first 3 chars indicate general area
        const fsaLookup: { [key: string]: { lat: number, lng: number, city: string, prov: string } } = {
          // Ontario L-codes (GTA and surrounding)
          'L0': { lat: 43.8, lng: -79.4, city: 'York Region', prov: 'ON' },
          'L1': { lat: 43.9, lng: -78.9, city: 'Oshawa/Durham', prov: 'ON' },
          'L2': { lat: 43.15, lng: -79.25, city: 'St. Catharines', prov: 'ON' },
          'L3': { lat: 43.9, lng: -79.5, city: 'Markham/Vaughan', prov: 'ON' },
          'L4': { lat: 44.0, lng: -79.45, city: 'Newmarket/Aurora', prov: 'ON' },
          'L5': { lat: 43.6, lng: -79.65, city: 'Mississauga', prov: 'ON' },
          'L6': { lat: 43.7, lng: -79.76, city: 'Brampton', prov: 'ON' },
          'L7': { lat: 43.52, lng: -79.85, city: 'Oakville/Milton', prov: 'ON' },
          'L8': { lat: 43.25, lng: -79.85, city: 'Hamilton', prov: 'ON' },
          'L9': { lat: 43.73, lng: -80.0, city: 'Georgetown/Acton', prov: 'ON' },
          // Ontario M-codes (Toronto)
          'M1': { lat: 43.75, lng: -79.23, city: 'Scarborough East', prov: 'ON' },
          'M2': { lat: 43.78, lng: -79.35, city: 'North York', prov: 'ON' },
          'M3': { lat: 43.75, lng: -79.42, city: 'North York West', prov: 'ON' },
          'M4': { lat: 43.68, lng: -79.38, city: 'East York', prov: 'ON' },
          'M5': { lat: 43.65, lng: -79.38, city: 'Downtown Toronto', prov: 'ON' },
          'M6': { lat: 43.68, lng: -79.45, city: 'York/Etobicoke', prov: 'ON' },
          'M7': { lat: 43.66, lng: -79.39, city: 'Toronto Central', prov: 'ON' },
          'M8': { lat: 43.63, lng: -79.5, city: 'Etobicoke', prov: 'ON' },
          'M9': { lat: 43.65, lng: -79.55, city: 'Etobicoke West', prov: 'ON' },
          // Ontario K-codes (Ottawa area)
          'K1': { lat: 45.42, lng: -75.69, city: 'Ottawa Central', prov: 'ON' },
          'K2': { lat: 45.35, lng: -75.75, city: 'Ottawa West', prov: 'ON' },
          'K7': { lat: 44.23, lng: -76.48, city: 'Kingston', prov: 'ON' },
          // Ontario N-codes (Southwestern)
          'N1': { lat: 43.45, lng: -80.5, city: 'Guelph/Cambridge', prov: 'ON' },
          'N2': { lat: 43.48, lng: -80.52, city: 'Waterloo', prov: 'ON' },
          'N3': { lat: 43.27, lng: -80.82, city: 'Brantford', prov: 'ON' },
          'N5': { lat: 42.98, lng: -81.25, city: 'London', prov: 'ON' },
          'N6': { lat: 42.98, lng: -81.23, city: 'London East', prov: 'ON' },
          'N7': { lat: 43.32, lng: -81.15, city: 'Stratford', prov: 'ON' },
          'N8': { lat: 42.3, lng: -82.98, city: 'Windsor', prov: 'ON' },
          'N9': { lat: 42.32, lng: -83.02, city: 'Windsor West', prov: 'ON' },
        };
        
        // Check first 2 characters for common FSAs
        const fsaPrefix = partialPostalCode.substring(0, 2);
        if (fsaLookup[fsaPrefix]) {
          const location = fsaLookup[fsaPrefix];
          return res.json({
            lat: location.lat,
            lng: location.lng,
            displayName: `${partialPostalCode} area (${location.city}, ${location.prov}, Canada)`,
            isCanada: true
          });
        }
        
        // Fall back to Nominatim search for other postal codes
        const searchQuery = `${partialPostalCode}, Canada`;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=3&countrycodes=ca`;
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'PeacePad-CoParenting-App'
          }
        });
        
        data = await response.json();
        
        if (data && data.length > 0) {
          return res.json({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: `${partialPostalCode} area, ${data[0].address?.city || data[0].address?.town || ''}, Canada`,
            isCanada: true
          });
        }
      }
      
      // Use OpenStreetMap Nominatim for non-Canadian addresses or as fallback
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressStr)}&format=json&addressdetails=1&limit=1`;
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'PeacePad-CoParenting-App'
        }
      });
      
      data = await response.json();
      
      if (!data || data.length === 0) {
        return res.status(404).json({ message: "Location not found. Please check the postal code or address." });
      }
      
      const countryCode = data[0].address?.country_code;
      isCanada = countryCode === 'ca';
      
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

  // Support Resources directory - includes therapists, crisis support, government services, etc.
  app.get('/api/support-resources', isSoftAuthenticated, async (req, res) => {
    try {
      const { lat, lng, maxDistance, address, resourceType } = req.query;
      
      if (!lat || !lng) {
        return res.json([]);
      }
      
      const distanceNum = parseInt(maxDistance as string || '50');
      const filterType = resourceType as string || 'all';
      
      // Comprehensive support resources database
      // Resource types: therapist, crisis, government, family-services, legal, financial
      const allResources = [
        // CRISIS & IMMEDIATE SUPPORT (24/7, always available regardless of location)
        {
          id: 'crisis-988',
          name: '988 Suicide Crisis Helpline',
          type: 'crisis',
          specialty: '24/7 Crisis Support',
          description: 'Immediate support for anyone in suicidal crisis or emotional distress',
          address: 'Available across Canada',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '988 (call or text)',
          website: 'https://988.ca/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'crisis-kids',
          name: 'Kids Help Phone',
          type: 'crisis',
          specialty: 'Youth Crisis Support (Ages 5-29)',
          description: 'Professional counseling, information and referrals',
          address: 'Available across Canada',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '1-800-668-6868 or text CONNECT to 686868',
          website: 'https://kidshelpphone.ca/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'crisis-211',
          name: '211 Ontario',
          type: 'crisis',
          specialty: 'Community, Health & Social Services Helpline',
          description: 'Information and referral to community, health and mental health services',
          address: 'Available across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '211 or 1-877-330-3213',
          website: 'https://211ontario.ca/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French', '150+ languages via translation'],
          distance: 0,
        },
        {
          id: 'crisis-text',
          name: 'Crisis Text Line Canada',
          type: 'crisis',
          specialty: 'Text-Based Crisis Support',
          description: 'Free, confidential crisis support via text message',
          address: 'Available across Canada',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: 'Text CONNECT to 686868',
          website: 'https://www.crisistextline.ca/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'crisis-women',
          name: 'Assaulted Women\'s Helpline',
          type: 'crisis',
          specialty: 'Support for Women Experiencing Abuse',
          description: 'Crisis counseling, safety planning, and referrals',
          address: 'Available across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '1-866-863-0511 (TTY: 1-866-863-7868)',
          website: 'https://www.awhl.org/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French', '9+ languages'],
          distance: 0,
        },
        
        // THERAPISTS (Location-based)
        {
          id: '1',
          name: 'KMA Therapy',
          type: 'therapist',
          specialty: 'Individual, Couples & Family Counseling',
          description: 'Evidence-based therapy for anxiety, depression, relationships, trauma',
          address: 'Multiple Locations: Yonge & Eglinton, King West, Yorkville, Liberty Village, Toronto',
          latitude: '43.7015',
          longitude: '-79.3984',
          phone: 'Contact via website',
          email: null,
          website: 'https://www.kmatherapy.com/',
          rating: 4.8,
          distance: 5,
          acceptsInsurance: true,
          isFree: false,
          licenseNumber: 'College of Psychologists of Ontario',
        },
        {
          id: '2',
          name: 'Nuvista Mental Health',
          type: 'therapist',
          specialty: 'Anxiety, Depression, Family & Veterans Services',
          description: 'Comprehensive mental health services including veteran support',
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
          type: 'therapist',
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
          isFree: false,
          licenseNumber: 'Registered Psychotherapists (6+ years experience)',
        },
        {
          id: '4',
          name: 'The Therapy Centre',
          type: 'therapist',
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
          isFree: false,
          licenseNumber: 'Licensed Therapists',
        },
        {
          id: '5',
          name: 'Toronto Family Therapy & Mediation',
          type: 'therapist',
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
          isFree: false,
          licenseNumber: 'Joanna Seidel, MSW, RSW, Acc.FM',
        },
        {
          id: '6',
          name: 'Marriage & Family Therapy Toronto',
          type: 'therapist',
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
          isFree: false,
          licenseNumber: 'Registered Therapists, Sliding Scale Rates',
        },
        {
          id: '7',
          name: 'Family Service Toronto',
          type: 'family-services',
          specialty: 'Individual, Couples, Family Counseling (Sliding Scale)',
          description: 'Comprehensive family support services including counseling, parenting programs, and crisis intervention',
          address: 'Toronto, Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '416-595-9618',
          email: null,
          website: 'https://familyservicetoronto.org/',
          rating: 4.5,
          distance: 8,
          acceptsInsurance: true,
          isFree: true,
          hours: 'Mon-Fri 9am-6pm',
          licenseNumber: 'Free & Low-Cost Options Available',
        },
        {
          id: '8',
          name: 'The Mindfulness Clinic',
          type: 'therapist',
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
          isFree: false,
          isOnline: true,
          licenseNumber: 'Multilingual (English, Russian, Farsi, Hindi, Urdu)',
        },

        // GOVERNMENT & COMMUNITY SERVICES (Free/Low-Cost)
        {
          id: 'gov-camh',
          name: 'CAMH - Centre for Addiction and Mental Health',
          type: 'government',
          specialty: 'Mental Health & Addiction Services',
          description: 'Canada\'s largest mental health and addiction teaching hospital, offering emergency services, assessment, and treatment',
          address: '1001 Queen St W, Toronto',
          latitude: '43.6384',
          longitude: '-79.4190',
          phone: '416-535-8501',
          website: 'https://www.camh.ca/',
          hours: 'Emergency 24/7, Clinics vary',
          isFree: true,
          languages: ['English', 'French', '100+ languages via interpretation'],
          distance: 5,
        },
        {
          id: 'gov-ontario-mental-health',
          name: 'Ontario Mental Health Helpline',
          type: 'government',
          specialty: 'Mental Health Information & Referrals',
          description: 'Free, confidential support and information about mental health services in Ontario',
          address: 'Available across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '1-866-531-2600',
          website: 'https://www.ontario.ca/page/find-mental-health-support',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'gov-cmha-toronto',
          name: 'CMHA Toronto - Canadian Mental Health Association',
          type: 'government',
          specialty: 'Mental Health Programs & Support',
          description: 'Free mental health programs, support groups, housing support, and peer support services',
          address: '1200 Markham Rd, Scarborough',
          latitude: '43.7735',
          longitude: '-79.2315',
          phone: '416-289-6285',
          website: 'https://toronto.cmha.ca/',
          hours: 'Mon-Fri 9am-5pm',
          isFree: true,
          languages: ['English', 'Multiple languages available'],
          distance: 12,
        },
        {
          id: 'gov-distress-centre',
          name: 'Distress Centre Toronto',
          type: 'government',
          specialty: '24/7 Crisis & Emotional Support Line',
          description: 'Free, anonymous crisis and emotional support by phone, text, or online chat',
          address: 'Available across Toronto',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '416-408-4357 or text 45645',
          website: 'https://www.torontodistresscentre.com/',
          hours: '24/7',
          isFree: true,
          isOnline: true,
          languages: ['English'],
          distance: 0,
        },

        // FAMILY SERVICES (Community-Based Support)
        {
          id: 'fam-jf-jcs',
          name: 'Jewish Family & Child Service',
          type: 'family-services',
          specialty: 'Family Counseling, Parenting Support, Child Services',
          description: 'Free and low-cost counseling for individuals, couples, and families. Parenting programs and child/youth services',
          address: '4600 Bathurst St, Toronto',
          latitude: '43.7615',
          longitude: '-79.4298',
          phone: '416-638-7800',
          website: 'https://www.jfandcs.com/',
          hours: 'Mon-Thu 9am-9pm, Fri 9am-4pm, Sun 9am-5pm',
          isFree: true,
          rating: 4.7,
          languages: ['English', 'Hebrew', 'Russian', 'French'],
          distance: 8,
        },
        {
          id: 'fam-ywca',
          name: 'YWCA Toronto - Family Support Services',
          type: 'family-services',
          specialty: 'Women & Families Support, Parenting Programs',
          description: 'Free programs for women and families including parenting support, child care, and counseling services',
          address: '87 Elm St, Toronto',
          latitude: '43.6558',
          longitude: '-79.3860',
          phone: '416-961-8100',
          website: 'https://www.ywcatoronto.org/',
          hours: 'Mon-Fri 9am-5pm',
          isFree: true,
          rating: 4.6,
          languages: ['English', 'Multiple languages available'],
          distance: 3,
        },
        {
          id: 'fam-woodgreen',
          name: 'Woodgreen Community Services',
          type: 'family-services',
          specialty: 'Family Support, Parenting, Child Development',
          description: 'Free family counseling, parenting programs, and child development services for diverse communities',
          address: '815 Danforth Ave, Toronto',
          latitude: '43.6796',
          longitude: '-79.3491',
          phone: '416-645-6000',
          website: 'https://www.woodgreen.org/',
          hours: 'Mon-Fri 9am-5pm',
          isFree: true,
          rating: 4.5,
          languages: ['English', 'Multiple languages available'],
          distance: 6,
        },
        {
          id: 'fam-catholic-family',
          name: 'Catholic Family Services of Toronto',
          type: 'family-services',
          specialty: 'Marriage, Family & Individual Counseling',
          description: 'Professional counseling for individuals, couples, and families. Sliding scale fees available',
          address: '147 Prince Arthur Ave, Toronto',
          latitude: '43.6725',
          longitude: '-79.3933',
          phone: '416-921-1163',
          website: 'https://www.cfstoronto.com/',
          hours: 'Mon-Fri 9am-8pm, Sat 9am-1pm',
          isFree: true,
          rating: 4.7,
          languages: ['English', 'French', 'Spanish', 'Portuguese'],
          distance: 4,
        },

        // LEGAL RESOURCES (Family Law & Co-Parenting)
        {
          id: 'legal-family-law-info',
          name: 'Family Law Information Centre (FLIC)',
          type: 'legal',
          specialty: 'Free Family Law Information & Resources',
          description: 'Free legal information about separation, divorce, custody, and support. Duty counsel available',
          address: '393 University Ave, Toronto (Family Court)',
          latitude: '43.6591',
          longitude: '-79.3888',
          phone: '416-326-0554',
          website: 'https://www.ontario.ca/page/family-law-information-centres',
          hours: 'Mon-Fri 9am-5pm',
          isFree: true,
          rating: 4.4,
          languages: ['English', 'French', 'Interpretation available'],
          distance: 2,
        },
        {
          id: 'legal-pro-bono',
          name: 'Pro Bono Ontario - Family Law',
          type: 'legal',
          specialty: 'Free Legal Advice for Low-Income Families',
          description: 'Free family law advice hotline and summary legal advice clinics for those who cannot afford a lawyer',
          address: 'Online & Phone across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '1-855-255-7256',
          website: 'https://www.probonoontario.org/',
          hours: 'Hotline: Mon-Fri 9am-5pm',
          isFree: true,
          isOnline: true,
          rating: 4.6,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'legal-community-legal',
          name: 'Community Legal Education Ontario (CLEO)',
          type: 'legal',
          specialty: 'Legal Information & Self-Help Resources',
          description: 'Free online legal information about family law, custody, support, separation agreements, and court processes',
          address: 'Online across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '416-408-4420',
          website: 'https://www.cleo.on.ca/',
          hours: 'Online 24/7, Phone Mon-Fri 9am-5pm',
          isFree: true,
          isOnline: true,
          rating: 4.5,
          languages: ['English', 'French'],
          distance: 0,
        },
        {
          id: 'legal-jfcy',
          name: 'Justice for Children and Youth (JFCY)',
          type: 'legal',
          specialty: 'Free Legal Services for Youth & Families',
          description: 'Free legal advice, representation, and advocacy for children, youth, and parents on child protection and family law matters',
          address: '415 Yonge St, Suite 1203, Toronto',
          latitude: '43.6596',
          longitude: '-79.3807',
          phone: '416-920-1633',
          website: 'https://jfcy.org/',
          hours: 'Mon-Fri 9am-5pm',
          isFree: true,
          rating: 4.8,
          languages: ['English', 'French'],
          distance: 2,
        },
        {
          id: 'legal-family-mediation',
          name: 'Ontario Association for Family Mediation',
          type: 'legal',
          specialty: 'Family Mediation & Dispute Resolution',
          description: 'Referral service for accredited family mediators. Alternative to court for resolving separation and parenting disputes',
          address: 'Referrals across Ontario',
          latitude: '43.6532',
          longitude: '-79.3832',
          phone: '1-800-989-6236',
          website: 'https://www.oafm.on.ca/',
          hours: 'Mon-Fri 9am-5pm',
          isFree: false,
          rating: 4.5,
          languages: ['English', 'French'],
          distance: 0,
        },
      ];
      
      // Calculate actual distances using haversine formula
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      
      const resourcesWithDistance = allResources.map((resource: any) => ({
        ...resource,
        distance: resource.isOnline ? 0 : Math.round(calculateDistance(
          userLat,
          userLng,
          parseFloat(resource.latitude),
          parseFloat(resource.longitude)
        ))
      }));
      
      // Filter by resource type if specified
      let filtered = filterType === 'all' 
        ? resourcesWithDistance 
        : resourcesWithDistance.filter((r: any) => r.type === filterType);
      
      // Filter by distance (crisis resources always included)
      filtered = filtered.filter((r: any) => 
        r.type === 'crisis' || r.isOnline || r.distance <= distanceNum
      );
      
      // Sort: crisis first, then by distance
      filtered.sort((a: any, b: any) => {
        if (a.type === 'crisis' && b.type !== 'crisis') return -1;
        if (a.type !== 'crisis' && b.type === 'crisis') return 1;
        return a.distance - b.distance;
      });
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching support resources:", error);
      res.status(500).json({ message: "Failed to fetch support resources" });
    }
  });
  
  // Keep old therapists endpoint for backward compatibility
  app.get('/api/therapists', isSoftAuthenticated, async (req, res) => {
    // Redirect to support-resources with therapist filter
    req.query.resourceType = 'therapist';
    return app._router.handle(
      Object.assign(req, { url: '/api/support-resources', originalUrl: '/api/support-resources' }), 
      res, 
      () => {}
    );
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

  // AI Listening - Emotion analysis from audio
  app.post('/api/analyze-emotion', isSoftAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, audioData, mimeType, timestamp } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ message: "Audio data required" });
      }

      // Transcribe audio using Whisper
      const transcription = await transcribeFromBase64(audioData, mimeType);
      
      if (!transcription.text || transcription.text.trim().length === 0) {
        return res.json({
          emotion: 'neutral',
          confidence: 0,
          summary: 'No speech detected',
        });
      }

      // Analyze emotion from transcript
      const emotionResult = await analyzeEmotion(transcription.text);

      res.json(emotionResult);
    } catch (error) {
      console.error("Error analyzing emotion:", error);
      res.status(500).json({ 
        emotion: 'neutral',
        confidence: 0,
        summary: 'Analysis failed',
      });
    }
  });

  // AI Listening - Generate session summary
  app.post('/api/session-summary', isSoftAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, emotionTimeline } = req.body;
      
      if (!emotionTimeline || emotionTimeline.length === 0) {
        return res.json({ 
          summary: 'No emotional data recorded for this session.' 
        });
      }

      const summary = await generateSessionSummary(emotionTimeline);

      // Save to database
      await storage.createSessionMoodSummary({
        sessionId,
        participants: [req.user.id], // Will be updated with actual participants
        emotionsTimeline: emotionTimeline,
        summary,
      });

      res.json({ summary });
    } catch (error) {
      console.error("Error generating session summary:", error);
      res.status(500).json({ 
        summary: 'Your conversation showed thoughtful communication. Keep building on these positive interactions.' 
      });
    }
  });

  // Get session mood summary
  app.get('/api/session-mood/:sessionId', isSoftAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const summary = await storage.getSessionMoodSummary(sessionId);
      
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      res.json(summary);
    } catch (error) {
      console.error("Error fetching session mood:", error);
      res.status(500).json({ message: "Failed to fetch session mood" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebRTC signaling server
  setupWebRTCSignaling(httpServer);
  
  return httpServer;
}
