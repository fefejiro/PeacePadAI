import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMessageSchema, insertNoteSchema, insertTaskSchema, insertChildUpdateSchema, insertPetSchema, insertExpenseSchema, insertEventSchema, insertCallRecordingSchema, insertTherapistSchema, insertAuditLogSchema } from "@shared/schema";
import { 
  setupWebRTCSignaling, 
  broadcastNewMessage, 
  notifyPartnershipJoin,
  notifyIncomingCall,
  notifyCallAccepted,
  notifyCallDeclined,
  notifyCallEnded
} from "./webrtc-signaling";
import OpenAI from "openai";
import { transcribeFromBase64 } from "./whisperService";
import { analyzeEmotion, generateSessionSummary } from "./emotionAnalyzer";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, mockToneAnalysis, createCacheKey } from "./aiHelper";
import { generateICalFromEvents } from "./utils/icalGenerator";
import { seedScheduleTemplates } from "./seedTemplates";
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
      model: "gpt-3.5-turbo", // Using cost-effective legacy model (75x cheaper than GPT-4)
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
  await setupAuth(app);
  
  // Seed schedule templates on server startup (non-blocking)
  seedScheduleTemplates().catch(err => {
    console.error("Failed to seed schedule templates (will retry on next startup):", err.message);
  });

  // Get current authenticated user (Replit Auth)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
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

  // Get specific user by ID (basic info only for assigned tasks, etc.)
  app.get('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return only basic user info for privacy
      const basicUserInfo = {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };
      
      res.json(basicUserInfo);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Accept terms and conditions (including NDA)
  app.post('/api/users/accept-terms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        termsAcceptedAt: new Date(),
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  // Message routes
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/messages/preview', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionId = req.user.sessionId;
      
      let conversationId = req.body.conversationId;
      let recipientId = req.body.recipientId;
      
      // If conversationId is provided, verify user is a member
      if (conversationId) {
        const members = await storage.getConversationMembers(conversationId);
        const isMember = members.some((m) => m.userId === userId);
        
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this conversation" });
        }
      } else if (recipientId) {
        // Legacy: recipientId provided - find or create direct conversation
        const recipient = await storage.getUser(recipientId);
        if (!recipient) {
          return res.status(400).json({ message: "Invalid recipient" });
        }
        
        // Find existing direct conversation or create one
        let directConv = await storage.findDirectConversation(userId, recipientId);
        if (!directConv) {
          directConv = await storage.createConversation({
            type: 'direct',
            createdBy: userId,
          });
          await storage.addConversationMember({
            conversationId: directConv.id,
            userId: userId,
          });
          await storage.addConversationMember({
            conversationId: directConv.id,
            userId: recipientId,
          });
        }
        conversationId = directConv.id;
      } else {
        return res.status(400).json({ message: "Either conversationId or recipientId is required" });
      }
      
      const parsed = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
        conversationId,
        recipientId, // Keep for backward compatibility
      });

      const { tone, summary, emoji, rewordingSuggestion} = await analyzeTone(parsed.content);
      
      const message = await storage.createMessage({
        ...parsed,
        tone,
        toneSummary: summary,
        toneEmoji: emoji,
        rewordingSuggestion,
      });

      // Broadcast to all conversation members that a new message was posted
      broadcastNewMessage();

      res.json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: error.message || "Failed to create message" });
    }
  });

  // Chat attachments upload endpoint
  app.post('/api/chat-attachments', isAuthenticated, chatUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/receipt-upload', isAuthenticated, receiptUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/profile-upload', isAuthenticated, profileUpload.single('file'), async (req: any, res) => {
    try {
      console.log('[Profile Upload] Starting upload for user:', req.user?.id);
      console.log('[Profile Upload] Content-Type:', req.headers['content-type']);
      
      const userId = req.user.claims.sub;
      const file = req.file;
      
      console.log('[Profile Upload] File received:', file ? {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      } : 'NO FILE');
      
      if (!file) {
        console.error('[Profile Upload] No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Validate file type (images only)
      if (!file.mimetype.startsWith('image/')) {
        console.error('[Profile Upload] Invalid file type:', file.mimetype);
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      
      const profileImageUrl = `/uploads/profiles/${file.filename}`;
      
      console.log('[Profile Upload] Success! File saved at:', profileImageUrl);
      res.json({
        profileImageUrl,
        fileName: file.originalname,
        fileSize: file.size.toString(),
      });
    } catch (error: any) {
      console.error("[Profile Upload] Error:", error);
      console.error("[Profile Upload] Error stack:", error.stack);
      res.status(400).json({ message: error.message || "Failed to upload profile photo" });
    }
  });

  // Partnership routes
  app.get('/api/partnerships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/partnerships/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode } = req.body;

      console.log(`[Partnership Join] User ${userId} attempting to join with code: ${inviteCode}`);

      if (!inviteCode || inviteCode.length !== 6) {
        console.log(`[Partnership Join] Invalid code length: ${inviteCode?.length}`);
        return res.status(400).json({ message: "Invalid invite code" });
      }

      // Find user with this invite code
      const coParent = await storage.getUserByInviteCode(inviteCode);
      
      if (!coParent) {
        console.log(`[Partnership Join] No user found with invite code: ${inviteCode}`);
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      console.log(`[Partnership Join] Found co-parent: ${coParent.displayName} (ID: ${coParent.id})`);

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
      console.log(`[Partnership Join] Creating partnership between ${userId} and ${coParent.id}`);
      const partnership = await storage.createPartnership({
        user1Id: userId,
        user2Id: coParent.id,
        inviteCode: inviteCode,
        allowAudio: true,
        allowVideo: true,
        allowRecording: false,
        allowAiTone: true,
      });
      console.log(`[Partnership Join] ✅ Partnership created successfully! ID: ${partnership.id}`);

      // Auto-create 1:1 direct conversation for this partnership
      const existingConversation = await storage.findDirectConversation(userId, coParent.id);
      
      if (!existingConversation) {
        console.log(`[Partnership Join] Creating 1:1 conversation for partnership`);
        const conversation = await storage.createConversation({
          type: 'direct',
          createdBy: userId,
        });

        // Add both users as members
        await storage.addConversationMember({
          conversationId: conversation.id,
          userId: userId,
        });
        await storage.addConversationMember({
          conversationId: conversation.id,
          userId: coParent.id,
        });
        console.log(`[Partnership Join] ✅ 1:1 conversation created! ID: ${conversation.id}`);
      } else {
        console.log(`[Partnership Join] 1:1 conversation already exists (ID: ${existingConversation.id})`);
      }

      // Auto-create family group conversation if 3+ people are connected
      const allPartnerships = await storage.getPartnerships(userId);
      const coParentPartnerships = await storage.getPartnerships(coParent.id);
      
      // Collect all unique user IDs in the partnership network
      const allUserIds = new Set<string>();
      allUserIds.add(userId);
      allUserIds.add(coParent.id);
      
      [...allPartnerships, ...coParentPartnerships].forEach(p => {
        allUserIds.add(p.user1Id);
        allUserIds.add(p.user2Id);
      });
      
      const uniqueUserIds = Array.from(allUserIds);
      
      // If 3+ people are connected, create/ensure family group exists
      if (uniqueUserIds.length >= 3) {
        // Check if a group conversation already exists with these exact members
        const userConversations = await storage.getConversations(userId);
        const existingGroup = userConversations.find(conv => {
          if (conv.type !== 'group') return false;
          const memberIds = conv.members.map((m: any) => m.id).sort();
          const expectedIds = uniqueUserIds.sort();
          return memberIds.length === expectedIds.length && 
                 memberIds.every((id: string, i: number) => id === expectedIds[i]);
        });
        
        if (!existingGroup) {
          const groupConversation = await storage.createConversation({
            name: 'Family Group',
            type: 'group',
            createdBy: userId,
          });

          // Add all connected users as members
          await Promise.all(
            uniqueUserIds.map(uid =>
              storage.addConversationMember({
                conversationId: groupConversation.id,
                userId: uid,
              })
            )
          );

          // Create audit log for family group creation
          await storage.createAuditLog({
            userId,
            actionType: 'conversation_created',
            resourceId: groupConversation.id,
            resourceType: 'conversation',
            details: {
              conversationType: 'group',
              conversationName: 'Family Group',
              memberCount: uniqueUserIds.length,
              trigger: 'auto_created_on_partnership',
            },
          });
        }
      }

      // Get current user info for notification
      const currentUser = await storage.getUser(userId);
      
      // Notify the co-parent that someone joined using their code
      if (currentUser) {
        notifyPartnershipJoin(coParent.id, currentUser.displayName || 'Someone');
      }

      const response = {
        ...partnership,
        coParent: {
          id: coParent.id,
          displayName: coParent.displayName,
          profileImageUrl: coParent.profileImageUrl,
        },
      };
      
      console.log(`[Partnership Join] ✅ SUCCESS! Sending response to client`);
      res.json(response);
    } catch (error) {
      console.error("[Partnership Join] ❌ ERROR:", error);
      console.error("[Partnership Join] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to join partnership" });
    }
  });

  app.post('/api/partnerships/regenerate-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newCode = await storage.regenerateInviteCode(userId);
      res.json({ inviteCode: newCode });
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  app.patch('/api/partnerships/:id/custody', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const partnershipId = req.params.id;
      const { custodyEnabled, custodyPattern, custodyStartDate, custodyPrimaryParent, custodyConfig, user1Color, user2Color } = req.body;

      // Verify user is part of this partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ message: "Partnership not found" });
      }
      if (partnership.user1Id !== userId && partnership.user2Id !== userId) {
        return res.status(403).json({ message: "You are not part of this partnership" });
      }

      // Update custody settings
      const updates: any = {};
      if (custodyEnabled !== undefined) updates.custodyEnabled = custodyEnabled;
      if (custodyPattern !== undefined) updates.custodyPattern = custodyPattern;
      if (custodyStartDate !== undefined) updates.custodyStartDate = custodyStartDate ? new Date(custodyStartDate) : null;
      if (custodyPrimaryParent !== undefined) updates.custodyPrimaryParent = custodyPrimaryParent;
      if (custodyConfig !== undefined) updates.custodyConfig = custodyConfig;
      if (user1Color !== undefined) updates.user1Color = user1Color;
      if (user2Color !== undefined) updates.user2Color = user2Color;

      const updatedPartnership = await storage.updatePartnership(partnershipId, updates);
      res.json(updatedPartnership);
    } catch (error) {
      console.error("Error updating custody schedule:", error);
      res.status(500).json({ message: "Failed to update custody schedule" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, type, memberIds } = req.body;

      if (!type || !memberIds || !Array.isArray(memberIds)) {
        return res.status(400).json({ message: "Missing required fields: type, memberIds" });
      }

      // Create conversation
      const conversation = await storage.createConversation({
        name,
        type,
        createdBy: userId,
      });

      // Add members to conversation
      const memberPromises = memberIds.map((memberId: string) =>
        storage.addConversationMember({
          conversationId: conversation.id,
          userId: memberId,
        })
      );
      await Promise.all(memberPromises);

      // Create audit log for group conversation creation
      if (type === 'group') {
        await storage.createAuditLog({
          userId,
          actionType: 'conversation_created',
          resourceId: conversation.id,
          resourceType: 'conversation',
          details: {
            conversationType: type,
            conversationName: name,
            memberCount: memberIds.length,
          },
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;

      // Verify user is a member of this conversation
      const members = await storage.getConversationMembers(conversationId);
      const isMember = members.some((m) => m.userId === userId);

      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this conversation" });
      }

      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Note routes
  app.get('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notes = await storage.getNotes(userId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch('/api/notes/:id', isAuthenticated, async (req, res) => {
    try {
      const note = await storage.updateNote(req.params.id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(400).json({ message: "Failed to update note" });
    }
  });

  app.delete('/api/notes/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(400).json({ message: "Failed to delete note" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.patch('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: "Failed to delete task" });
    }
  });

  // Child update routes
  app.get('/api/child-updates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = await storage.getChildUpdates(userId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching child updates:", error);
      res.status(500).json({ message: "Failed to fetch child updates" });
    }
  });

  app.post('/api/child-updates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete('/api/child-updates/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteChildUpdate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting child update:", error);
      res.status(400).json({ message: "Failed to delete child update" });
    }
  });

  // Pet routes
  app.get('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pets = await storage.getPets(userId);
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  app.post('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expenses = await storage.getExpenses(userId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/therapists/search', isAuthenticated, async (req: any, res) => {
    try {
      const postalCode = req.query.postalCode as string;
      
      if (!postalCode) {
        return res.status(400).json({ message: "Postal code required" });
      }

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
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Export events as iCal/ICS file for calendar apps (Google Calendar, Apple Calendar, Outlook, etc.)
  app.get('/api/events/export/ical', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEvents(userId);
      
      // Get user's display name for calendar title
      const user = await storage.getUser(userId);
      const calendarName = user?.displayName 
        ? `${user.displayName}'s PeacePad Custody Schedule` 
        : 'PeacePad Custody Schedule';
      
      // Generate iCal content
      const icalContent = generateICalFromEvents(events, calendarName);
      
      // Set headers for file download
      const filename = `peacepad-custody-${new Date().toISOString().split('T')[0]}.ics`;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(icalContent);
    } catch (error) {
      console.error("Error exporting events to iCal:", error);
      res.status(500).json({ message: "Failed to export calendar" });
    }
  });

  // Schedule template routes
  app.get('/api/schedule-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getScheduleTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching schedule templates:", error);
      res.status(500).json({ message: "Failed to fetch schedule templates" });
    }
  });

  app.post('/api/schedule-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const template = await storage.createScheduleTemplate({
        ...req.body,
        createdBy: userId,
        isCustom: true,
        isPublic: false,
      });
      res.json(template);
    } catch (error: any) {
      console.error("Error creating schedule template:", error);
      res.status(400).json({ message: error.message || "Failed to create schedule template" });
    }
  });

  app.post('/api/schedule-templates/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = req.params.id;
      const { startDate, childName, location } = req.body;

      const template = await storage.getScheduleTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Parse the template pattern (JSON) and generate events
      const pattern = JSON.parse(template.pattern);
      const generatedEvents = [];
      const baseDate = new Date(startDate);

      // Generate events based on pattern (simplified version)
      for (const eventDef of pattern.events) {
        const eventDate = new Date(baseDate);
        eventDate.setDate(baseDate.getDate() + (eventDef.dayOffset || 0));

        const event = await storage.createEvent({
          title: eventDef.title,
          type: eventDef.type,
          startDate: eventDate,
          endDate: eventDef.duration ? new Date(eventDate.getTime() + eventDef.duration * 60 * 60 * 1000) : undefined,
          description: eventDef.description,
          location: location || eventDef.location,
          childName: childName || eventDef.childName,
          recurring: eventDef.recurring,
          notes: `Created from template: ${template.name}`,
          createdBy: userId,
        });
        generatedEvents.push(event);
      }

      res.json({ 
        message: `Applied template: ${template.name}`, 
        events: generatedEvents 
      });
    } catch (error: any) {
      console.error("Error applying schedule template:", error);
      res.status(400).json({ message: error.message || "Failed to apply schedule template" });
    }
  });

  app.delete('/api/schedule-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = req.params.id;
      await storage.deleteScheduleTemplate(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule template:", error);
      res.status(500).json({ message: "Failed to delete schedule template" });
    }
  });

  // AI conflict detection for events
  app.get('/api/events/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/call-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/call-sessions/:code/end', isAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;
      await storage.endCallSession(code);
      res.json({ message: "Call ended successfully" });
    } catch (error) {
      console.error("Error ending call session:", error);
      res.status(500).json({ message: "Failed to end call session" });
    }
  });

  // ============ NEW DIRECT CALLING SYSTEM ============

  // POST /api/calls - Initiate a direct call to a co-parent
  app.post('/api/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { receiverId, callType, partnershipId } = req.body;

      // Validate call type
      if (!['audio', 'video'].includes(callType)) {
        return res.status(400).json({ message: "Invalid call type. Must be 'audio' or 'video'" });
      }

      // Verify receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      // Create the call record
      const call = await storage.createCall({
        callerId: userId,
        receiverId,
        partnershipId: partnershipId || null,
        callType,
        status: 'ringing',
      });

      // Notify receiver of incoming call via WebSocket
      await notifyIncomingCall(receiverId, call.id, userId, callType);

      res.json(call);
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  // GET /api/calls - Get call history with optional filters
  app.get('/api/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { filter } = req.query; // 'all', 'missed', 'received', 'outgoing'

      const calls = await storage.getCalls(userId, filter as string);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // PATCH /api/calls/:id/accept - Accept an incoming call
  app.patch('/api/calls/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const call = await storage.getCall(id);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      if (call.receiverId !== userId) {
        return res.status(403).json({ message: "You can only accept calls made to you" });
      }

      if (call.status !== 'ringing') {
        return res.status(400).json({ message: "Call is not in ringing state" });
      }

      const updatedCall = await storage.updateCall(id, {
        status: 'active',
        startedAt: new Date(),
      });

      // Notify caller that call was accepted via WebSocket
      notifyCallAccepted(call.callerId, id, userId);

      res.json(updatedCall);
    } catch (error) {
      console.error("Error accepting call:", error);
      res.status(500).json({ message: "Failed to accept call" });
    }
  });

  // PATCH /api/calls/:id/decline - Decline an incoming call
  app.patch('/api/calls/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { reason } = req.body; // "Busy", "Can't talk now", "Will call back", "Other"

      const call = await storage.getCall(id);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      if (call.receiverId !== userId) {
        return res.status(403).json({ message: "You can only decline calls made to you" });
      }

      if (call.status !== 'ringing') {
        return res.status(400).json({ message: "Call is not in ringing state" });
      }

      const updatedCall = await storage.updateCall(id, {
        status: 'declined',
        declineReason: reason || 'No reason provided',
        endedAt: new Date(),
      });

      // Notify caller that call was declined via WebSocket
      notifyCallDeclined(call.callerId, id, userId, reason);

      res.json(updatedCall);
    } catch (error) {
      console.error("Error declining call:", error);
      res.status(500).json({ message: "Failed to decline call" });
    }
  });

  // PATCH /api/calls/:id/end - End an active call
  app.patch('/api/calls/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const call = await storage.getCall(id);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Either caller or receiver can end the call
      if (call.callerId !== userId && call.receiverId !== userId) {
        return res.status(403).json({ message: "You can only end calls you're part of" });
      }

      if (call.status !== 'active' && call.status !== 'ringing') {
        return res.status(400).json({ message: "Call is not active or ringing" });
      }

      const endedAt = new Date();
      let duration = '0';

      // Calculate duration if call was active
      if (call.status === 'active' && call.startedAt) {
        const durationMs = endedAt.getTime() - new Date(call.startedAt).getTime();
        duration = Math.floor(durationMs / 1000).toString(); // Duration in seconds
      }

      // If call was ringing and ended, mark as missed
      const finalStatus = call.status === 'ringing' ? 'missed' : 'ended';

      const updatedCall = await storage.updateCall(id, {
        status: finalStatus,
        endedAt,
        duration,
      });

      // Notify the other party that call ended via WebSocket
      const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
      notifyCallEnded(otherUserId, id, userId);

      res.json(updatedCall);
    } catch (error) {
      console.error("Error ending call:", error);
      res.status(500).json({ message: "Failed to end call" });
    }
  });

  // POST /api/scheduled-calls - Schedule a future call
  app.post('/api/scheduled-calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { participantId, callType, scheduledFor, title, notes, partnershipId } = req.body;

      // Validate call type
      if (!['audio', 'video'].includes(callType)) {
        return res.status(400).json({ message: "Invalid call type. Must be 'audio' or 'video'" });
      }

      // Verify participant exists
      const participant = await storage.getUser(participantId);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      // Validate scheduled time is in the future
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      const scheduledCall = await storage.createScheduledCall({
        schedulerId: userId,
        participantId,
        partnershipId: partnershipId || null,
        callType,
        scheduledFor: scheduledDate,
        title: title || 'Scheduled Call',
        notes: notes || null,
      });

      res.json(scheduledCall);
    } catch (error) {
      console.error("Error scheduling call:", error);
      res.status(500).json({ message: "Failed to schedule call" });
    }
  });

  // GET /api/scheduled-calls - Get scheduled calls
  app.get('/api/scheduled-calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduledCalls = await storage.getScheduledCalls(userId);
      res.json(scheduledCalls);
    } catch (error) {
      console.error("Error fetching scheduled calls:", error);
      res.status(500).json({ message: "Failed to fetch scheduled calls" });
    }
  });

  // ============ END NEW DIRECT CALLING SYSTEM ============

  // Authenticated file serving for uploads
  app.get('/uploads/recordings/:filename', isAuthenticated, (req: any, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    // Validate file exists and is within uploads directory
    if (!fs.existsSync(filePath) || !filePath.startsWith(uploadDir)) {
      return res.status(404).json({ message: "File not found" });
    }
    
    res.sendFile(filePath);
  });

  // Call recording routes
  app.post('/api/call-recordings', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/call-recordings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/geocode', isAuthenticated, async (req, res) => {
    try {
      const { query, address } = req.query;
      const searchTerm = (query || address) as string;
      
      if (!searchTerm) {
        return res.json({ results: [] });
      }
      
      const addressStr = searchTerm;
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
              results: [{
                lat: parseFloat(geocoderData.latt),
                lng: parseFloat(geocoderData.longt),
                displayName: `${postalCode}, ${geocoderData.standard?.city || ''}, ${geocoderData.standard?.prov || 'ON'}, Canada`,
                address: `${postalCode}, ${geocoderData.standard?.city || ''}, ${geocoderData.standard?.prov || 'ON'}, Canada`,
                city: geocoderData.standard?.city,
                state: geocoderData.standard?.prov || 'ON',
                country: 'Canada'
              }]
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
            results: [{
              lat: location.lat,
              lng: location.lng,
              displayName: `${partialPostalCode} area (${location.city}, ${location.prov}, Canada)`,
              address: `${partialPostalCode} area, ${location.city}, ${location.prov}, Canada`,
              city: location.city,
              state: location.prov,
              country: 'Canada'
            }]
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
            results: [{
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              displayName: `${partialPostalCode} area, ${data[0].address?.city || data[0].address?.town || ''}, Canada`,
              address: data[0].display_name,
              city: data[0].address?.city || data[0].address?.town,
              state: data[0].address?.state,
              country: 'Canada'
            }]
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
        return res.json({ results: [] });
      }
      
      // Return multiple results from Nominatim (up to 5)
      const results = data.slice(0, 5).map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        address: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        postalCode: item.address?.postcode
      }));
      
      res.json({ results });
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
  app.get('/api/support-resources', isAuthenticated, async (req, res) => {
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
  app.get('/api/therapists', isAuthenticated, async (req, res) => {
    // Redirect to support-resources with therapist filter
    req.query.resourceType = 'therapist';
    return app._router.handle(
      Object.assign(req, { url: '/api/support-resources', originalUrl: '/api/support-resources' }), 
      res, 
      () => {}
    );
  });

  app.post('/api/therapists', isAuthenticated, async (req, res) => {
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
  app.get('/api/audit-trail', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        // Generate FRO-compliant CSV with conversation metadata
        let csv = 'Type,Content,Date,Conversation Type,Participants,Tone,Details\n';
        
        auditTrail.messages.forEach((m: any) => {
          const content = (m.content || '').replace(/"/g, '""'); // Escape quotes
          const conversationType = m.conversationType || 'Unknown';
          const participants = (m.participants || 'Unknown').replace(/"/g, '""');
          const tone = m.tone || 'N/A';
          const details = m.toneSummary ? m.toneSummary.replace(/"/g, '""') : '';
          csv += `Message,"${content}",${m.timestamp},"${conversationType}","${participants}","${tone}","${details}"\n`;
        });
        
        auditTrail.events.forEach((e: any) => {
          const title = (e.title || '').replace(/"/g, '""');
          csv += `Event,"${title}",${e.startDate},"N/A","N/A","N/A","Type: ${e.type}"\n`;
        });
        
        auditTrail.calls.forEach((c: any) => {
          csv += `Call,"${c.callType} call",${c.createdAt},"N/A","N/A","N/A","Code: ${c.sessionCode}"\n`;
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

  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getAuditLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // AI Listening - Emotion analysis from audio
  app.post('/api/analyze-emotion', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/session-summary', isAuthenticated, async (req: any, res) => {
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
        participants: [req.user.claims.sub], // Will be updated with actual participants
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
  app.get('/api/session-mood/:sessionId', isAuthenticated, async (req: any, res) => {
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

  // Geocoding API for location autocomplete (using OpenStreetMap Nominatim)
  app.get('/api/geocode', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json({ results: [] });
      }

      // Use OpenStreetMap Nominatim API for geocoding
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'PeacePad Co-Parenting App', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      // Transform Nominatim results to our format
      const results = data.map((item: any) => ({
        displayName: item.display_name,
        address: item.address?.road || item.address?.city || item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        postalCode: item.address?.postcode,
      }));

      res.json({ results });
    } catch (error) {
      console.error("Error geocoding location:", error);
      res.status(500).json({ message: "Failed to geocode location", results: [] });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebRTC signaling server
  setupWebRTCSignaling(httpServer);
  
  return httpServer;
}
