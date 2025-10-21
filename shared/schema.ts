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

// User storage table for Replit Auth (Google OAuth)
// IMPORTANT: Keep the .default() config for id column (required for Replit Auth migration)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  phoneNumber: varchar("phone_number"), // Optional phone number for contact info
  sharePhoneWithContacts: boolean("share_phone_with_contacts").notNull().default(false), // User must opt-in to share phone
  inviteCode: varchar("invite_code", { length: 6 }).unique(), // 6-character invite code for partnership invites
  relationshipType: varchar("relationship_type"), // ex-spouse, separated, never-married, other
  childName: varchar("child_name"), // Primary child's name (optional)
  consentAcceptedAt: timestamp("consent_accepted_at"), // Timestamp when user accepted consent agreement
  termsAcceptedAt: timestamp("terms_accepted_at"), // Timestamp when user accepted Terms & Conditions (including NDA)
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

// Contacts table for managing relationships and permissions (legacy - being replaced by partnerships)
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Owner of the contact
  peerUserId: varchar("peer_user_id").notNull().references(() => users.id), // The contact person
  nickname: varchar("nickname"), // Optional custom nickname for the contact
  allowAudio: boolean("allow_audio").notNull().default(true), // Permission for audio calls
  allowVideo: boolean("allow_video").notNull().default(true), // Permission for video calls
  allowSms: boolean("allow_sms").notNull().default(false), // Permission to send SMS
  allowRecording: boolean("allow_recording").notNull().default(false), // Permission for call recording
  allowAiTone: boolean("allow_ai_tone").notNull().default(false), // Permission for AI tone analysis
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Partnerships table for co-parenting relationships (supports multiple co-parents)
export const partnerships = pgTable("partnerships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id), // First co-parent
  user2Id: varchar("user2_id").notNull().references(() => users.id), // Second co-parent
  inviteCode: varchar("invite_code", { length: 6 }).notNull(), // Shared code used to create partnership
  // Partnership-level permissions (both parties can configure)
  allowAudio: boolean("allow_audio").notNull().default(true),
  allowVideo: boolean("allow_video").notNull().default(true),
  allowRecording: boolean("allow_recording").notNull().default(false),
  allowAiTone: boolean("allow_ai_tone").notNull().default(true), // Default on for co-parenting
  // Custody schedule configuration
  custodyEnabled: boolean("custody_enabled").notNull().default(false), // Toggle custody calendar feature
  custodyPattern: text("custody_pattern"), // week_on_off, every_other_weekend, two_two_three, custom
  custodyStartDate: timestamp("custody_start_date"), // When the pattern begins
  custodyPrimaryParent: text("custody_primary_parent"), // user1 or user2 - who has custody first
  custodyConfig: jsonb("custody_config"), // Custom pattern configuration (days of week, etc.)
  user1Color: text("user1_color").default("#3b82f6"), // User 1 calendar color (soft blue)
  user2Color: text("user2_color").default("#10b981"), // User 2 calendar color (soft green)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversations table for both 1:1 and group chats (FRO compliant)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // Optional name for group chats (e.g., "Family Group")
  type: text("type").notNull(), // 'direct' for 1:1, 'group' for 3+ people
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversation members junction table (who's in each conversation)
export const conversationMembers = pgTable("conversation_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
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
  recipientId: varchar("recipient_id").references(() => users.id), // For backward compatibility with 1:1 conversations
  conversationId: varchar("conversation_id").references(() => conversations.id), // New: links message to conversation
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  tone: text("tone"),
  toneSummary: text("tone_summary"),
  toneEmoji: text("tone_emoji"),
  rewordingSuggestion: text("rewording_suggestion"),
  // WhatsApp-like media support
  messageType: text("message_type").notNull().default("text"), // text, image, audio, video, document
  fileUrl: text("file_url"), // URL to uploaded file
  fileName: text("file_name"), // Original file name
  fileSize: text("file_size"), // File size in bytes
  mimeType: text("mime_type"), // MIME type of file
  duration: text("duration"), // Duration for audio/video in seconds
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
  location: text("location"), // Structured location data (JSON: {address, lat, lng})
  assignedTo: varchar("assigned_to").references(() => users.id), // User assigned to complete this task
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const childUpdates = pgTable("child_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  childName: text("child_name").notNull(),
  update: text("update").notNull(),
  location: text("location"), // Structured location data (JSON: {address, lat, lng})
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
  type: text("type").notNull(), // pickup, dropoff, custody_switch, appointment, other
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  description: text("description"),
  location: text("location"), // Structured location data (JSON: {address, lat, lng, displayName})
  childName: text("child_name"), // Which child this relates to
  recurring: text("recurring"), // none, daily, weekly, biweekly, monthly
  notes: text("notes"), // Additional notes
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Custody schedule templates for quick setup (every other weekend, 2-2-3, etc.)
export const scheduleTemplates = pgTable("schedule_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Every Other Weekend", "2-2-3 Schedule", etc.
  description: text("description").notNull(), // Detailed explanation of the pattern
  pattern: text("pattern").notNull(), // JSON structure defining the schedule pattern
  isCustom: boolean("is_custom").notNull().default(false), // true for user-created templates
  createdBy: varchar("created_by").references(() => users.id), // null for system templates
  isPublic: boolean("is_public").notNull().default(true), // System templates are public
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  paidBy: varchar("paid_by").notNull().references(() => users.id),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id), // Link to partnership
  status: text("status").notNull().default("pending"), // pending, paid, settled
  receiptUrl: text("receipt_url"), // URL to uploaded receipt image/PDF
  fileName: text("file_name"), // Original file name of receipt
  fileSize: text("file_size"), // File size in bytes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Expense participants - tracks who owes what on each expense
export const expenseParticipants = pgTable("expense_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  owedAmount: text("owed_amount").notNull(), // How much this person owes
  paidAmount: text("paid_amount").notNull().default("0"), // How much they've paid back
  percentage: text("percentage").notNull(), // Their share percentage (e.g., "60" for 60%)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Settlements - payment acknowledgements for expenses
export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  payerId: varchar("payer_id").notNull().references(() => users.id), // Who is paying
  receiverId: varchar("receiver_id").notNull().references(() => users.id), // Who receives payment
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  amount: text("amount").notNull(), // Amount being settled
  method: text("method").notNull(), // manual, etransfer, paypal, wise, other
  paymentLink: text("payment_link"), // Optional link to external payment (e.g., PayPal.me)
  status: text("status").notNull().default("initiated"), // initiated, pending_confirmation, confirmed, rejected
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"), // When receiver confirmed receipt
  rejectedAt: timestamp("rejected_at"), // When receiver disputed
  rejectedReason: text("rejected_reason"), // Why settlement was rejected
  reminderSentAt: timestamp("reminder_sent_at"), // Track when reminder was sent
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Partnership balances - running total of who owes what
export const partnershipBalances = pgTable("partnership_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  netBalance: text("net_balance").notNull().default("0"), // Positive = they owe others, Negative = others owe them
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Call sessions for shareable video/audio calls (legacy - for session code approach)
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionCode: varchar("session_code").notNull().unique(), // 6-digit code like Zoom
  hostId: varchar("host_id").notNull().references(() => users.id),
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Direct calls between co-parents (new calling system)
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id").notNull().references(() => users.id), // Who initiated the call
  receiverId: varchar("receiver_id").notNull().references(() => users.id), // Who was called
  partnershipId: varchar("partnership_id").references(() => partnerships.id), // Link to partnership
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  status: varchar("status").notNull().default("ringing"), // ringing, active, ended, missed, declined
  declineReason: text("decline_reason"), // "Busy", "Can't talk now", "Will call back", "Other"
  startedAt: timestamp("started_at"), // When call was answered (null if never answered)
  endedAt: timestamp("ended_at"), // When call ended
  duration: text("duration"), // Duration in seconds (calculated from startedAt to endedAt)
  createdAt: timestamp("created_at").notNull().defaultNow(), // When call was initiated
});

// Scheduled calls for future appointments
export const scheduledCalls = pgTable("scheduled_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schedulerId: varchar("scheduler_id").notNull().references(() => users.id), // Who scheduled the call
  participantId: varchar("participant_id").notNull().references(() => users.id), // Other participant
  partnershipId: varchar("partnership_id").references(() => partnerships.id),
  callType: varchar("call_type").notNull(), // 'audio' or 'video'
  scheduledFor: timestamp("scheduled_for").notNull(), // When the call is scheduled
  title: text("title"), // Optional title like "Weekly check-in"
  notes: text("notes"), // Optional notes about the call
  reminderSent: boolean("reminder_sent").notNull().default(false), // Track if reminder notification was sent
  status: varchar("status").notNull().default("pending"), // pending, completed, cancelled, missed
  actualCallId: varchar("actual_call_id").references(() => calls.id), // Links to actual call when it happens
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Session mood summaries for AI listening feature (7-day TTL)
export const sessionMoodSummaries = pgTable("session_mood_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => callSessions.id),
  participants: text("participants").array().notNull(), // Array of participant user IDs
  emotionsTimeline: jsonb("emotions_timeline").notNull().default('[]'), // Array of {timestamp, emotion, confidence}
  summary: text("summary"), // AI-generated summary of emotional journey
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull().default(sql`NOW() + INTERVAL '7 days'`), // Auto-delete after 7 days
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertChildUpdateSchema = createInsertSchema(childUpdates).omit({ id: true, createdAt: true });
export const insertPetSchema = createInsertSchema(pets).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({ id: true, createdAt: true });
export const insertUsageMetricSchema = createInsertSchema(usageMetrics).omit({ id: true, lastUpdated: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnershipSchema = createInsertSchema(partnerships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationMemberSchema = createInsertSchema(conversationMembers).omit({ id: true, joinedAt: true });

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
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;
export type Partnership = typeof partnerships.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversationMember = z.infer<typeof insertConversationMemberSchema>;
export type ConversationMember = typeof conversationMembers.$inferSelect;
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

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const insertSessionMoodSummarySchema = createInsertSchema(sessionMoodSummaries).omit({ id: true, createdAt: true, expiresAt: true });
export type InsertSessionMoodSummary = z.infer<typeof insertSessionMoodSummarySchema>;
export type SessionMoodSummary = typeof sessionMoodSummaries.$inferSelect;

export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({ id: true, createdAt: true });
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;

export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export const insertScheduledCallSchema = createInsertSchema(scheduledCalls).omit({ id: true, createdAt: true });
export type InsertScheduledCall = z.infer<typeof insertScheduledCallSchema>;
export type ScheduledCall = typeof scheduledCalls.$inferSelect;

export const insertExpenseParticipantSchema = createInsertSchema(expenseParticipants).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpenseParticipant = z.infer<typeof insertExpenseParticipantSchema>;
export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;

export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true, updatedAt: true, initiatedAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;

export const insertPartnershipBalanceSchema = createInsertSchema(partnershipBalances).omit({ id: true, lastUpdated: true });
export type InsertPartnershipBalance = z.infer<typeof insertPartnershipBalanceSchema>;
export type PartnershipBalance = typeof partnershipBalances.$inferSelect;
