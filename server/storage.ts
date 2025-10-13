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
  callSessions,
  callRecordings,
  therapists,
  auditLogs,
  pushSubscriptions,
  sessionMoodSummaries,
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
  type CallSession,
  type InsertCallSession,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
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
  
  // Call session operations
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSessionByCode(sessionCode: string): Promise<CallSession | undefined>;
  endCallSession(sessionCode: string): Promise<void>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
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
    const result = await db.select().from(contacts).where(eq(contacts.userId, userId));
    return result;
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

  // Note operations
  async getNotes(userId: string): Promise<Note[]> {
    return await db.select().from(notes)
      .where(eq(notes.createdBy, userId))
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
    return await db.select().from(tasks)
      .where(eq(tasks.createdBy, userId))
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
    return await db.select().from(childUpdates)
      .where(eq(childUpdates.createdBy, userId))
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
    return await db.select().from(pets)
      .where(eq(pets.createdBy, userId))
      .orderBy(desc(pets.createdAt));
  }

  async createPet(petData: InsertPet): Promise<Pet> {
    const [pet] = await db.insert(pets).values(petData).returning();
    return pet;
  }

  // Expense operations
  async getExpenses(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses)
      .where(eq(expenses.paidBy, userId))
      .orderBy(desc(expenses.createdAt));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }

  // Event operations
  async getEvents(userId: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.createdBy, userId))
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
    // Get all messages
    const userMessages = await db.select().from(messages)
      .where(eq(messages.senderId, userId))
      .orderBy(messages.timestamp);
    
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
      messages: userMessages,
      events: userEvents,
      calls: userCalls,
      recordings: userRecordings,
      summary: {
        totalMessages: userMessages.length,
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
}

export const storage = new DatabaseStorage();
