import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSoftAuth, isSoftAuthenticated, trackUsage } from "./softAuth";
import { insertMessageSchema, insertNoteSchema, insertTaskSchema, insertChildUpdateSchema, insertPetSchema, insertExpenseSchema, insertEventSchema } from "@shared/schema";
import { setupWebRTCSignaling } from "./webrtc-signaling";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  // Message routes
  app.get('/api/messages', isSoftAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
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
      const parsed = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const { tone, summary, emoji, rewordingSuggestion } = await analyzeTone(parsed.content);
      
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

      res.json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: error.message || "Failed to create message" });
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

  const httpServer = createServer(app);
  
  // Set up WebRTC signaling server
  setupWebRTCSignaling(httpServer);
  
  return httpServer;
}
