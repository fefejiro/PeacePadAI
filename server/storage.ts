import {
  users,
  messages,
  notes,
  tasks,
  childUpdates,
  pets,
  expenses,
  events,
  guestSessions,
  usageMetrics,
  contacts,
  partnerships,
  conversations,
  conversationMembers,
  callSessions,
  calls,
  scheduledCalls,
  callRecordings,
  therapists,
  auditLogs,
  pushSubscriptions,
  sessionMoodSummaries,
  scheduleTemplates,
  type User,
  type UpsertUser,
  type Message,
  type InsertMessage,
  type Note,
  type InsertNote,
  type Task,
  type InsertTask,
  type ChildUpdate,
  type InsertChildUpdate,
  type Pet,
  type InsertPet,
  type Expense,
  type InsertExpense,
  type Event,
  type InsertEvent,
  type GuestSession,
  type InsertGuestSession,
  type UsageMetric,
  type InsertUsageMetric,
  type Contact,
  type InsertContact,
  type Partnership,
  type InsertPartnership,
  type Conversation,
  type InsertConversation,
  type ConversationMember,
  type InsertConversationMember,
  type CallSession,
  type InsertCallSession,
  type Call,
  type InsertCall,
  type ScheduledCall,
  type InsertScheduledCall,
  type CallRecording,
  type InsertCallRecording,
  type Therapist,
  type InsertTherapist,
  type AuditLog,
  type InsertAuditLog,
  type PushSubscription,
  type InsertPushSubscription,
  type SessionMoodSummary,
  type InsertSessionMoodSummary,
  type ScheduleTemplate,
  type InsertScheduleTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  getOtherUsers(currentUserId: string): Promise<User[]>;
  
  // Guest session operations
  getGuestSession(sessionId: string): Promise<GuestSession | undefined>;
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  updateGuestSessionActivity(sessionId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Usage metrics operations
  getUsageMetrics(sessionId: string): Promise<UsageMetric | undefined>;
  createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric>;
  updateUsageMetric(sessionId: string, updates: Partial<UsageMetric>): Promise<void>;
  
  // Message operations
  getMessages(): Promise<Message[]>;
  getMessagesByUser(userId: string): Promise<any[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Contact operations
  getContacts(userId: string): Promise<Contact[]>;
  getContactWithUser(userId: string, peerUserId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  
  // Partnership operations
  getPartnerships(userId: string): Promise<Partnership[]>;
  getPartnershipByCode(inviteCode: string): Promise<Partnership | undefined>;
  getPartnership(partnershipId: string): Promise<Partnership | undefined>;
  createPartnership(partnership: InsertPartnership): Promise<Partnership>;
  updatePartnership(partnershipId: string, updates: Partial<Partnership>): Promise<Partnership>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  generateInviteCode(): Promise<string>;
  regenerateInviteCode(userId: string): Promise<string>;
  
  // Conversation operations
  getConversations(userId: string): Promise<any[]>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addConversationMember(member: InsertConversationMember): Promise<ConversationMember>;
  getConversationMembers(conversationId: string): Promise<ConversationMember[]>;
  getConversationMessages(conversationId: string): Promise<any[]>;
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined>;
  
  // Note operations
  getNotes(userId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Child update operations
  getChildUpdates(userId: string): Promise<ChildUpdate[]>;
  createChildUpdate(update: InsertChildUpdate): Promise<ChildUpdate>;
  deleteChildUpdate(id: string): Promise<void>;
  
  // Pet operations
  getPets(userId: string): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Expense operations
  getExpenses(userId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  
  // Event operations
  getEvents(userId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Call session operations (legacy)
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSessionByCode(sessionCode: string): Promise<CallSession | undefined>;
  endCallSession(sessionCode: string): Promise<void>;
  
  // New direct calling operations
  createCall(call: InsertCall): Promise<Call>;
  getCall(id: string): Promise<Call | undefined>;
  getCalls(userId: string, filter?: string): Promise<Call[]>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call>;
  
  // Scheduled call operations
  createScheduledCall(scheduledCall: InsertScheduledCall): Promise<ScheduledCall>;
  getScheduledCalls(userId: string): Promise<ScheduledCall[]>;
  getScheduledCall(id: string): Promise<ScheduledCall | undefined>;
  updateScheduledCall(id: string, updates: Partial<ScheduledCall>): Promise<ScheduledCall>;
  
  // Call recording operations
  createCallRecording(recording: InsertCallRecording): Promise<CallRecording>;
  getCallRecordings(userId: string): Promise<CallRecording[]>;
  getCallRecordingById(id: string): Promise<CallRecording | undefined>;
  
  // Therapist operations
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  getTherapists(): Promise<Therapist[]>;
  searchTherapists(userLat: string, userLng: string, maxDistance?: number): Promise<Therapist[]>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId: string): Promise<AuditLog[]>;
  getUserAuditTrail(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  
  // Push subscription operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  
  // Session mood summary operations
  createSessionMoodSummary(summary: InsertSessionMoodSummary): Promise<SessionMoodSummary>;
  getSessionMoodSummary(sessionId: string): Promise<SessionMoodSummary | undefined>;
  getSessionMoodSummariesByUser(userId: string): Promise<SessionMoodSummary[]>;
  
  // Schedule template operations
  getScheduleTemplates(userId?: string): Promise<ScheduleTemplate[]>;
  getScheduleTemplate(id: string): Promise<ScheduleTemplate | undefined>;
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  deleteScheduleTemplate(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Only generate invite code for NEW users (not updates)
    // Check if user exists first to prevent code regeneration on updates
    let existingUser: User | undefined;
    if (userData.id) {
      existingUser = await this.getUser(userData.id);
    }
    
    // Generate invite code only for truly new users
    if (!userData.inviteCode && !existingUser) {
      const newCode = await this.generateInviteCode();
      console.log(`[Storage] Generated invite code for new user: ${newCode}`);
      userData.inviteCode = newCode;
    }
    
    // Filter out undefined values to prevent overwriting existing data with null
    const cleanedData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );
    
    // If updating existing user, preserve their invite code
    if (existingUser && !cleanedData.inviteCode) {
      delete cleanedData.inviteCode;
    }
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...cleanedData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    console.log(`[Storage] User upserted - ID: ${user.id}, Invite Code: ${user.inviteCode}, Display Name: ${user.displayName}`);
    return user;
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.guestId, guestId));
    return user;
  }

  async getOtherUsers(currentUserId: string): Promise<User[]> {
    const { ne } = await import("drizzle-orm");
    const otherUsers = await db.select().from(users).where(ne(users.id, currentUserId));
    return otherUsers;
  }

  // Guest session operations
  async getGuestSession(sessionId: string): Promise<GuestSession | undefined> {
    const [session] = await db.select().from(guestSessions).where(eq(guestSessions.sessionId, sessionId));
    return session;
  }

  async createGuestSession(sessionData: InsertGuestSession): Promise<GuestSession> {
    const [session] = await db.insert(guestSessions).values(sessionData).returning();
    return session;
  }

  async updateGuestSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(guestSessions)
      .set({ lastActive: new Date() })
      .where(eq(guestSessions.sessionId, sessionId));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(guestSessions).where(desc(guestSessions.expiresAt));
  }

  // Usage metrics operations
  async getUsageMetrics(sessionId: string): Promise<UsageMetric | undefined> {
    const [metric] = await db.select().from(usageMetrics).where(eq(usageMetrics.sessionId, sessionId));
    return metric;
  }

  async createUsageMetric(metricData: InsertUsageMetric): Promise<UsageMetric> {
    const [metric] = await db.insert(usageMetrics).values(metricData).returning();
    return metric;
  }

  async updateUsageMetric(sessionId: string, updates: Partial<UsageMetric>): Promise<void> {
    await db
      .update(usageMetrics)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(usageMetrics.sessionId, sessionId));
  }

  // Message operations
  async getMessages(): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        senderDisplayName: users.displayName,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImage: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(messages.timestamp);
    
    return result;
  }

  async getMessagesByUser(userId: string): Promise<any[]> {
    // Get all messages where user is either sender OR recipient (1:1 conversation)
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        mimeType: messages.mimeType,
        duration: messages.duration,
        senderDisplayName: users.displayName,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImage: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.recipientId, userId)
        )
      )
      .orderBy(messages.timestamp);
    
    return result;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  // Contact operations
  async getContacts(userId: string): Promise<Contact[]> {
    const result = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        peerUserId: contacts.peerUserId,
        nickname: contacts.nickname,
        allowAudio: contacts.allowAudio,
        allowVideo: contacts.allowVideo,
        allowSms: contacts.allowSms,
        allowRecording: contacts.allowRecording,
        allowAiTone: contacts.allowAiTone,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        peerUser: {
          id: users.id,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.peerUserId, users.id))
      .where(eq(contacts.userId, userId));
    
    return result as any; // Type assertion needed due to nested object
  }

  async getContactWithUser(userId: string, peerUserId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.peerUserId, peerUserId)
      ));
    return contact;
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(contactData).returning();
    return contact;
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [contact] = await db.update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Partnership operations
  async getPartnerships(userId: string): Promise<Partnership[]> {
    const result = await db
      .select()
      .from(partnerships)
      .where(
        or(
          eq(partnerships.user1Id, userId),
          eq(partnerships.user2Id, userId)
        )
      );
    return result;
  }

  async getPartnershipByCode(inviteCode: string): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.inviteCode, inviteCode));
    return partnership;
  }

  async getPartnership(partnershipId: string): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.id, partnershipId));
    return partnership;
  }

  async createPartnership(partnershipData: InsertPartnership): Promise<Partnership> {
    const [partnership] = await db.insert(partnerships).values(partnershipData).returning();
    return partnership;
  }

  async updatePartnership(partnershipId: string, updates: Partial<Partnership>): Promise<Partnership> {
    const [partnership] = await db.update(partnerships)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerships.id, partnershipId))
      .returning();
    return partnership;
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    console.log(`[Storage] Looking up user by invite code: ${inviteCode}`);
    const [user] = await db.select().from(users).where(eq(users.inviteCode, inviteCode));
    
    if (user) {
      console.log(`[Storage] Found user with invite code ${inviteCode}: ${user.displayName} (ID: ${user.id})`);
    } else {
      console.log(`[Storage] No user found with invite code: ${inviteCode}`);
      // Debug: Let's see all invite codes in the database
      const allUsers = await db.select({ id: users.id, displayName: users.displayName, inviteCode: users.inviteCode }).from(users);
      console.log(`[Storage] All users in database:`, allUsers);
    }
    
    return user;
  }

  async generateInviteCode(): Promise<string> {
    // Generate a unique 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Keep generating until we find a unique one
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code is unique
      const existing = await this.getUserByInviteCode(code);
      if (!existing) {
        isUnique = true;
      }
    }
    
    return code;
  }

  async regenerateInviteCode(userId: string): Promise<string> {
    const newCode = await this.generateInviteCode();
    await db
      .update(users)
      .set({ inviteCode: newCode, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return newCode;
  }

  // Conversation operations
  async getConversations(userId: string): Promise<any[]> {
    // Get all conversations the user is a member of
    const userConversations = await db
      .select({
        conversation: conversations,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(eq(conversationMembers.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    // Enrich each conversation with member details
    const enrichedConversations = await Promise.all(
      userConversations.map(async ({ conversation }) => {
        const members = await this.getConversationMembers(conversation.id);
        const memberDetails = await Promise.all(
          members.map(async (member) => {
            const user = await this.getUser(member.userId);
            return {
              id: user?.id,
              displayName: user?.displayName,
              profileImageUrl: user?.profileImageUrl,
            };
          })
        );

        return {
          ...conversation,
          members: memberDetails,
        };
      })
    );

    return enrichedConversations;
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conversation;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(conversationData).returning();
    return conversation;
  }

  async addConversationMember(memberData: InsertConversationMember): Promise<ConversationMember> {
    const [member] = await db.insert(conversationMembers).values(memberData).returning();
    return member;
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    return await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        conversationId: messages.conversationId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        mimeType: messages.mimeType,
        duration: messages.duration,
        senderDisplayName: users.displayName,
        senderProfileImageUrl: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
    
    return result;
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    // Find a direct conversation between two users
    const conversations1 = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId1));

    const conversations2 = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId2));

    // Find common conversations
    const commonConvIds = conversations1
      .map(c => c.conversationId)
      .filter(id => conversations2.some(c2 => c2.conversationId === id));

    // Check which ones are direct (have exactly 2 members)
    for (const convId of commonConvIds) {
      const members = await this.getConversationMembers(convId);
      if (members.length === 2) {
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(and(
            eq(conversations.id, convId),
            eq(conversations.type, 'direct')
          ));
        if (conversation) {
          return conversation;
        }
      }
    }

    return undefined;
  }

  // Note operations
  async getNotes(userId: string): Promise<Note[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return notes created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(notes)
      .where(inArray(notes.createdBy, Array.from(partnerUserIds)))
      .orderBy(desc(notes.createdAt));
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(noteData).returning();
    return note;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note> {
    const [note] = await db
      .update(notes)
      .set(noteData)
      .where(eq(notes.id, id))
      .returning();
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return tasks created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(tasks)
      .where(inArray(tasks.createdBy, Array.from(partnerUserIds)))
      .orderBy(tasks.createdAt);
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Child update operations
  async getChildUpdates(userId: string): Promise<ChildUpdate[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return child updates created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(childUpdates)
      .where(inArray(childUpdates.createdBy, Array.from(partnerUserIds)))
      .orderBy(desc(childUpdates.createdAt));
  }

  async createChildUpdate(updateData: InsertChildUpdate): Promise<ChildUpdate> {
    const [update] = await db.insert(childUpdates).values(updateData).returning();
    return update;
  }

  async deleteChildUpdate(id: string): Promise<void> {
    await db.delete(childUpdates).where(eq(childUpdates.id, id));
  }

  // Pet operations
  async getPets(userId: string): Promise<Pet[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return pets created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(pets)
      .where(inArray(pets.createdBy, Array.from(partnerUserIds)))
      .orderBy(desc(pets.createdAt));
  }

  async createPet(petData: InsertPet): Promise<Pet> {
    const [pet] = await db.insert(pets).values(petData).returning();
    return pet;
  }

  // Expense operations
  async getExpenses(userId: string): Promise<Expense[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return expenses paid by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(expenses)
      .where(inArray(expenses.paidBy, Array.from(partnerUserIds)))
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }

  // Event operations
  async getEvents(userId: string): Promise<Event[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return events created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(events)
      .where(inArray(events.createdBy, Array.from(partnerUserIds)))
      .orderBy(events.startDate);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
    return event;
  }

  // Call session operations
  async createCallSession(sessionData: InsertCallSession): Promise<CallSession> {
    const [session] = await db.insert(callSessions).values(sessionData).returning();
    return session;
  }

  async getCallSessionByCode(sessionCode: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.sessionCode, sessionCode));
    return session;
  }

  async endCallSession(sessionCode: string): Promise<void> {
    await db.update(callSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(callSessions.sessionCode, sessionCode));
  }

  // New direct calling operations
  async createCall(callData: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(callData).returning();
    return call;
  }

  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async getCalls(userId: string, filter?: string): Promise<Call[]> {
    // Get all calls where user is either caller or receiver
    const userCalls = await db.select().from(calls)
      .where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId)))
      .orderBy(desc(calls.createdAt));

    // Apply filters
    if (!filter || filter === 'all') {
      return userCalls;
    }

    if (filter === 'missed') {
      return userCalls.filter(c => c.status === 'missed' && c.receiverId === userId);
    }

    if (filter === 'received') {
      return userCalls.filter(c => c.receiverId === userId && (c.status === 'ended' || c.status === 'active'));
    }

    if (filter === 'outgoing') {
      return userCalls.filter(c => c.callerId === userId);
    }

    return userCalls;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call> {
    const [updatedCall] = await db.update(calls)
      .set({ ...updates, createdAt: undefined } as any) // Don't update createdAt
      .where(eq(calls.id, id))
      .returning();
    return updatedCall;
  }

  // Scheduled call operations
  async createScheduledCall(scheduledCallData: InsertScheduledCall): Promise<ScheduledCall> {
    const [scheduledCall] = await db.insert(scheduledCalls).values(scheduledCallData).returning();
    return scheduledCall;
  }

  async getScheduledCalls(userId: string): Promise<ScheduledCall[]> {
    // Get scheduled calls where user is either scheduler or participant
    return await db.select().from(scheduledCalls)
      .where(or(eq(scheduledCalls.schedulerId, userId), eq(scheduledCalls.participantId, userId)))
      .orderBy(scheduledCalls.scheduledFor);
  }

  async getScheduledCall(id: string): Promise<ScheduledCall | undefined> {
    const [scheduledCall] = await db.select().from(scheduledCalls).where(eq(scheduledCalls.id, id));
    return scheduledCall;
  }

  async updateScheduledCall(id: string, updates: Partial<ScheduledCall>): Promise<ScheduledCall> {
    const [updated] = await db.update(scheduledCalls)
      .set({ ...updates, createdAt: undefined } as any)
      .where(eq(scheduledCalls.id, id))
      .returning();
    return updated;
  }

  // Call recording operations
  async createCallRecording(recordingData: InsertCallRecording): Promise<CallRecording> {
    const [recording] = await db.insert(callRecordings).values(recordingData).returning();
    return recording;
  }

  async getCallRecordings(userId: string): Promise<CallRecording[]> {
    return await db.select().from(callRecordings)
      .where(eq(callRecordings.recordedBy, userId))
      .orderBy(desc(callRecordings.createdAt));
  }

  async getCallRecordingById(id: string): Promise<CallRecording | undefined> {
    const [recording] = await db.select().from(callRecordings).where(eq(callRecordings.id, id));
    return recording;
  }

  // Therapist operations
  async createTherapist(therapistData: InsertTherapist): Promise<Therapist> {
    const [therapist] = await db.insert(therapists).values(therapistData).returning();
    return therapist;
  }

  async getTherapists(): Promise<Therapist[]> {
    return await db.select().from(therapists).orderBy(therapists.name);
  }

  async searchTherapists(userLat: string, userLng: string, maxDistance: number = 50): Promise<Therapist[]> {
    // Calculate distance using Haversine formula in SQL
    const allTherapists = await db.select().from(therapists);
    
    // Calculate distance for each therapist
    const therapistsWithDistance = allTherapists.map(t => {
      const lat1 = parseFloat(userLat);
      const lon1 = parseFloat(userLng);
      const lat2 = parseFloat(t.latitude);
      const lon2 = parseFloat(t.longitude);
      
      const R = 3959; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return { ...t, distance: distance.toFixed(2) };
    });
    
    // Filter by distance and sort
    return therapistsWithDistance
      .filter(t => parseFloat(t.distance || '0') <= maxDistance)
      .sort((a, b) => parseFloat(a.distance || '0') - parseFloat(b.distance || '0'));
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAuditLogs(userId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getUserAuditTrail(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Get all messages sent by user
    const userMessages = await db.select().from(messages)
      .where(eq(messages.senderId, userId))
      .orderBy(messages.timestamp);
    
    // Enrich messages with conversation metadata for FRO compliance
    const enrichedMessages = await Promise.all(
      userMessages.map(async (msg) => {
        let conversationType = 'Unknown';
        let participants: string[] = [];
        
        if (msg.conversationId) {
          const conversation = await this.getConversation(msg.conversationId);
          if (conversation) {
            conversationType = conversation.type === 'direct' ? 'Direct (1:1)' : 'Group';
            const members = await this.getConversationMembers(msg.conversationId);
            const memberDetails = await Promise.all(
              members.map(async (m) => {
                const user = await this.getUser(m.userId);
                return user?.displayName || 'Unknown User';
              })
            );
            participants = memberDetails;
          }
        } else if (msg.recipientId) {
          // Legacy 1:1 message
          conversationType = 'Direct (1:1 - Legacy)';
          const recipient = await this.getUser(msg.recipientId);
          const sender = await this.getUser(msg.senderId);
          participants = [sender?.displayName || 'You', recipient?.displayName || 'Unknown'];
        }
        
        return {
          ...msg,
          conversationType,
          participants: participants.join(', '),
        };
      })
    );
    
    // Get all events
    const userEvents = await db.select().from(events)
      .where(eq(events.createdBy, userId))
      .orderBy(events.startDate);
    
    // Get all call sessions
    const userCalls = await db.select().from(callSessions)
      .where(eq(callSessions.hostId, userId))
      .orderBy(desc(callSessions.createdAt));
    
    // Get call recordings
    const userRecordings = await db.select().from(callRecordings)
      .where(eq(callRecordings.recordedBy, userId))
      .orderBy(desc(callRecordings.createdAt));
    
    return {
      messages: enrichedMessages,
      events: userEvents,
      calls: userCalls,
      recordings: userRecordings,
      summary: {
        totalMessages: enrichedMessages.length,
        totalEvents: userEvents.length,
        totalCalls: userCalls.length,
        totalRecordings: userRecordings.length,
      }
    };
  }

  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [sub] = await db.insert(pushSubscriptions).values(subscription).returning();
    return sub;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  // Session mood summary operations
  async createSessionMoodSummary(summary: InsertSessionMoodSummary): Promise<SessionMoodSummary> {
    const [moodSummary] = await db.insert(sessionMoodSummaries).values(summary).returning();
    return moodSummary;
  }

  async getSessionMoodSummary(sessionId: string): Promise<SessionMoodSummary | undefined> {
    const [summary] = await db.select().from(sessionMoodSummaries)
      .where(eq(sessionMoodSummaries.sessionId, sessionId));
    return summary;
  }

  async getSessionMoodSummariesByUser(userId: string): Promise<SessionMoodSummary[]> {
    // Get summaries where user is a participant
    const summaries = await db.select().from(sessionMoodSummaries);
    return summaries.filter(s => s.participants.includes(userId));
  }

  // Schedule template operations
  async getScheduleTemplates(userId?: string): Promise<ScheduleTemplate[]> {
    if (userId) {
      // Return public system templates + user's custom templates
      return await db.select().from(scheduleTemplates)
        .where(
          or(
            eq(scheduleTemplates.isPublic, true),
            eq(scheduleTemplates.createdBy, userId)
          )
        )
        .orderBy(desc(scheduleTemplates.createdAt));
    } else {
      // Return only public system templates
      return await db.select().from(scheduleTemplates)
        .where(eq(scheduleTemplates.isPublic, true))
        .orderBy(desc(scheduleTemplates.createdAt));
    }
  }

  async getScheduleTemplate(id: string): Promise<ScheduleTemplate | undefined> {
    const [template] = await db.select().from(scheduleTemplates)
      .where(eq(scheduleTemplates.id, id));
    return template;
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [newTemplate] = await db.insert(scheduleTemplates).values(template).returning();
    return newTemplate;
  }

  async deleteScheduleTemplate(id: string): Promise<void> {
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
  }
}

export const storage = new DatabaseStorage();
