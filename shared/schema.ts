import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Soft Auth (supports both guests and named users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  isGuest: boolean("is_guest").notNull().default(true),
  guestId: varchar("guest_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guest session tracking with localStorage sync
export const guestSessions = pgTable("guest_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  displayName: varchar("display_name"),
  lastActive: timestamp("last_active").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Usage metrics tracking
export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.sessionId),
  userId: varchar("user_id").notNull().references(() => users.id),
  messagesSent: text("messages_sent").notNull().default("0"),
  toneAnalyzed: text("tone_analyzed").notNull().default("0"),
  therapistSearches: text("therapist_searches").notNull().default("0"),
  callActivity: text("call_activity").notNull().default("0"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  tone: text("tone"),
  toneSummary: text("tone_summary"),
  toneEmoji: text("tone_emoji"),
  rewordingSuggestion: text("rewording_suggestion"),
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  dueDate: text("due_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const childUpdates = pgTable("child_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childName: text("child_name").notNull(),
  update: text("update").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pets = pgTable("pets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  vetAppointments: text("vet_appointments"),
  expenses: text("expenses"),
  custodySchedule: text("custody_schedule"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  paidBy: varchar("paid_by").notNull().references(() => users.id),
  splitWith: varchar("split_with").references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Call sessions for shareable video/audio calls
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionCode: varchar("session_code").notNull().unique(), // 6-digit code like Zoom
  hostId: varchar("host_id").notNull().references(() => users.id),
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Call recordings for audit/legal purposes
export const callRecordings = pgTable("call_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => callSessions.id),
  recordingUrl: text("recording_url"), // Local blob URL or external storage
  transcript: text("transcript"), // AI-generated transcript
  duration: text("duration"), // Duration in seconds
  participants: text("participants").array(), // Array of participant IDs
  recordedBy: varchar("recorded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Therapist directory for legal/support resources
export const therapists = pgTable("therapists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  rating: text("rating"), // Average rating (1-5)
  reviewCount: text("review_count").notNull().default("0"),
  distance: text("distance"), // Calculated distance from user
  licenseNumber: text("license_number"),
  acceptsInsurance: boolean("accepts_insurance").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs for legal documentation
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actionType: text("action_type").notNull(), // 'message', 'call', 'appointment', 'export'
  resourceId: varchar("resource_id"), // ID of message, call, event, etc.
  resourceType: text("resource_type"), // 'message', 'call', 'event', etc.
  details: jsonb("details"), // Additional context
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertChildUpdateSchema = createInsertSchema(childUpdates).omit({ id: true, createdAt: true });
export const insertPetSchema = createInsertSchema(pets).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({ id: true, createdAt: true });
export const insertUsageMetricSchema = createInsertSchema(usageMetrics).omit({ id: true, lastUpdated: true });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertChildUpdate = z.infer<typeof insertChildUpdateSchema>;
export type ChildUpdate = typeof childUpdates.$inferSelect;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof pets.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertUsageMetric = z.infer<typeof insertUsageMetricSchema>;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export const insertCallSessionSchema = createInsertSchema(callSessions).omit({ id: true, createdAt: true });
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallSession = typeof callSessions.$inferSelect;

export const insertCallRecordingSchema = createInsertSchema(callRecordings).omit({ id: true, createdAt: true });
export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;
export type CallRecording = typeof callRecordings.$inferSelect;

export const insertTherapistSchema = createInsertSchema(therapists).omit({ id: true, createdAt: true });
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
