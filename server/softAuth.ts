import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { pool } from "./db";

export function getSession() {
  const sessionTtl = 14 * 24 * 60 * 60 * 1000; // 14 days
  const pgStore = connectPg(session);
  
  // Create session store with error handling
  const sessionStore = new pgStore({
    pool: pool, // Use the existing pool from db.ts with retry logic
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error) => {
      // Log session store errors without crashing the app
      if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        console.warn('[Session Store] Database suspended - sessions may not persist until database wakes');
      } else {
        console.error('[Session Store] Error:', error.message);
      }
    },
  });
  
  // Handle connection errors without blocking app startup
  sessionStore.on?.('error', (error) => {
    console.error('[Session Store] Store error:', error.message);
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

export async function setupSoftAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Guest entry endpoint
  app.post("/api/auth/guest", async (req: any, res) => {
    try {
      const { displayName, profileImageUrl, sessionId: clientSessionId } = req.body;

      // Check if session already exists
      if (clientSessionId) {
        const existingSession = await storage.getGuestSession(clientSessionId);
        if (existingSession && new Date(existingSession.expiresAt) > new Date()) {
          await storage.updateGuestSessionActivity(clientSessionId);
          const user = await storage.getUser(existingSession.userId);
          req.session.userId = existingSession.userId;
          req.session.sessionId = clientSessionId;
          return res.json({
            success: true,
            user,
            sessionId: clientSessionId,
            message: `Welcome back, ${user?.displayName || 'Guest'}!`,
          });
        }
      }

      // Create new guest user and session
      const guestId = nanoid(6);
      const sessionId = clientSessionId || nanoid(16);
      const finalDisplayName = displayName || `Guest${guestId}`;

      console.log(`[Auth] Creating new guest user: ${finalDisplayName}`);
      const user = await storage.upsertUser({
        displayName: finalDisplayName,
        isGuest: true,
        guestId,
        profileImageUrl: profileImageUrl || undefined,
      });
      console.log(`[Auth] User created with ID: ${user.id}, Invite Code: ${user.inviteCode}`);

      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await storage.createGuestSession({
        sessionId,
        userId: user.id,
        displayName: finalDisplayName,
        lastActive: new Date(),
        expiresAt,
      });

      await storage.createUsageMetric({
        sessionId,
        userId: user.id,
        messagesSent: "0",
        toneAnalyzed: "0",
        therapistSearches: "0",
        callActivity: "0",
      });

      req.session.userId = user.id;
      req.session.sessionId = sessionId;

      res.json({
        success: true,
        user,
        sessionId,
        message: `Welcome, ${finalDisplayName}!`,
      });
    } catch (error: any) {
      console.error("Guest auth error:", error);
      res.status(500).json({ message: "Failed to authenticate", error: error.message });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      let user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Ensure user has an invite code (for legacy users with null or empty codes)
      if (!user.inviteCode || user.inviteCode.trim() === '') {
        const newCode = await storage.generateInviteCode();
        user = await storage.upsertUser({
          ...user,
          inviteCode: newCode,
        });
      }

      res.json({ user, sessionId: req.session.sessionId });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      // Clear the session cookie explicitly
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.json({ success: true });
    });
  });
}

export const isSoftAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session.userId || !req.session.sessionId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const session = await storage.getGuestSession(req.session.sessionId);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ message: "Session expired" });
    }

    await storage.updateGuestSessionActivity(req.session.sessionId);
    req.user = { id: req.session.userId, sessionId: req.session.sessionId };
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Usage tracking helper
export async function trackUsage(sessionId: string, metric: string, increment: number = 1) {
  try {
    const existing = await storage.getUsageMetrics(sessionId);
    if (existing) {
      const currentValue = parseInt(existing[metric as keyof typeof existing] as string || "0");
      await storage.updateUsageMetric(sessionId, {
        [metric]: String(currentValue + increment),
      });
    }
  } catch (error) {
    console.error("Usage tracking error:", error);
  }
}
