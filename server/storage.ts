import {
  users,
  messages,
  notes,
  tasks,
  childUpdates,
  pets,
  expenses,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Message operations
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Note operations
  getNotes(): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Child update operations
  getChildUpdates(): Promise<ChildUpdate[]>;
  createChildUpdate(update: InsertChildUpdate): Promise<ChildUpdate>;
  deleteChildUpdate(id: string): Promise<void>;
  
  // Pet operations
  getPets(): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Expense operations
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
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

  // Message operations
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.timestamp);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  // Note operations
  async getNotes(): Promise<Note[]> {
    return await db.select().from(notes).orderBy(desc(notes.createdAt));
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
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(tasks.createdAt);
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
  async getChildUpdates(): Promise<ChildUpdate[]> {
    return await db.select().from(childUpdates).orderBy(desc(childUpdates.createdAt));
  }

  async createChildUpdate(updateData: InsertChildUpdate): Promise<ChildUpdate> {
    const [update] = await db.insert(childUpdates).values(updateData).returning();
    return update;
  }

  async deleteChildUpdate(id: string): Promise<void> {
    await db.delete(childUpdates).where(eq(childUpdates.id, id));
  }

  // Pet operations
  async getPets(): Promise<Pet[]> {
    return await db.select().from(pets).orderBy(desc(pets.createdAt));
  }

  async createPet(petData: InsertPet): Promise<Pet> {
    const [pet] = await db.insert(pets).values(petData).returning();
    return pet;
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }
}

export const storage = new DatabaseStorage();
