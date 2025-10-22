import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

// Store registered domains and OIDC config for dynamic registration
const registeredDomains: string[] = [];
const pendingRegistrations = new Map<string, Promise<string>>(); // Prevent race conditions
let oidcConfig: any = null;
let verifyCallback: VerifyFunction | null = null;

// Allowed domains whitelist - only these can have OAuth strategies
// SECURITY: This prevents Host header injection attacks
function getAllowedDomains(): string[] {
  const envDomains = process.env.REPLIT_DOMAINS?.split(",").map(d => d.trim().toLowerCase()) || [];
  
  // Add known custom domains here
  // In production, this should come from a secure configuration source
  const customDomains = process.env.CUSTOM_DOMAINS?.split(",").map(d => d.trim().toLowerCase()) || [];
  
  return [...envDomains, ...customDomains];
}

// Normalize and validate hostname
function normalizeHostname(hostname: string): string {
  // Remove port if present
  const normalized = hostname.split(':')[0].toLowerCase().trim();
  return normalized;
}

// Helper to get or create the correct strategy for a hostname
async function ensureStrategy(hostname: string): Promise<string> {
  // Normalize hostname for security
  const normalizedHost = normalizeHostname(hostname);
  const strategyName = `replitauth:${normalizedHost}`;
  
  // SECURITY: Check if domain is in allowlist
  const allowedDomains = getAllowedDomains();
  if (!allowedDomains.includes(normalizedHost)) {
    console.error(`[Auth Security] Rejected unauthorized domain: ${normalizedHost}`);
    console.error(`[Auth Security] Allowed domains: ${allowedDomains.join(', ')}`);
    throw new Error(`Domain ${normalizedHost} is not authorized for OAuth`);
  }
  
  // If already registered, return it
  if (registeredDomains.includes(normalizedHost)) {
    return strategyName;
  }
  
  // Check for pending registration to prevent race conditions
  if (pendingRegistrations.has(normalizedHost)) {
    console.log(`[Auth] Waiting for pending registration of: ${normalizedHost}`);
    return await pendingRegistrations.get(normalizedHost)!;
  }
  
  // Create pending promise to prevent concurrent registrations
  const registrationPromise = (async () => {
    try {
      console.log(`[Auth] Dynamically registering strategy for allowed domain: ${normalizedHost}`);
      
      if (!oidcConfig || !verifyCallback) {
        throw new Error("OIDC config not initialized");
      }
      
      const strategy = new Strategy(
        {
          name: strategyName,
          config: oidcConfig,
          scope: "openid email profile offline_access",
          callbackURL: `https://${normalizedHost}/api/callback`,
        },
        verifyCallback,
      );
      
      passport.use(strategy);
      registeredDomains.push(normalizedHost);
      console.log(`[Auth] Strategy registered: ${strategyName}`);
      
      return strategyName;
    } finally {
      pendingRegistrations.delete(normalizedHost);
    }
  })();
  
  pendingRegistrations.set(normalizedHost, registrationPromise);
  return await registrationPromise;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();
  oidcConfig = config; // Store for dynamic registration

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  verifyCallback = verify; // Store for dynamic registration

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  console.log("[Auth] Registering Replit Auth strategies for domains:", domains);
  
  for (const domain of domains) {
    const trimmedDomain = domain.trim();
    registeredDomains.push(trimmedDomain);
    const strategyName = `replitauth:${trimmedDomain}`;
    console.log(`[Auth] Registering strategy: ${strategyName}`);
    
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${trimmedDomain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }
  console.log("[Auth] All strategies registered successfully");

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    try {
      const strategyName = await ensureStrategy(req.hostname);
      console.log(`[Auth] Login requested - hostname: ${req.hostname}, strategy: ${strategyName}`);
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("[Auth] Error during login:", error);
      const message = error instanceof Error ? error.message : "Authentication configuration error";
      res.status(403).json({ message });
    }
  });

  app.get("/api/callback", async (req, res, next) => {
    try {
      const strategyName = await ensureStrategy(req.hostname);
      console.log(`[Auth] Callback received - hostname: ${req.hostname}, strategy: ${strategyName}`);
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } catch (error) {
      console.error("[Auth] Error during callback:", error);
      // Redirect to an error page with message
      res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h1>Authentication Error</h1>
          <p>${error instanceof Error ? error.message : 'Authentication configuration error'}</p>
          <p>Please contact support if this issue persists.</p>
        </body>
        </html>
      `);
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
