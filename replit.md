# PeacePad - Co-Parenting Communication Platform

## Overview
PeacePad is an AI-powered co-parenting communication platform designed to foster constructive dialogue between separated parents. It utilizes AI for tone analysis to reduce tension and promote effective communication. Inspired by applications like Linear, Headspace, and Notion, PeacePad offers real-time messaging, shared task management, collaborative note-taking, and child update tracking, aiming to facilitate smoother co-parenting relationships and broader market adoption.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Technology Stack**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query, Radix UI with shadcn/ui, Tailwind CSS.
- **Design System**: Custom calming color palette, Inter and JetBrains Mono fonts, accessibility-first.
- **Responsive Design**: Mobile-first approach with bottom navigation for mobile and sidebar for desktop.
- **Onboarding**: Streamlined 3-step flow (welcome/photo, optional details, invite code display) with smart state recovery.
- **PWA**: `manifest.json`, dynamic cache versioning service worker with auto-update notifications, network-first strategy for instant updates, manual install prompt button, offline support, "Add to Home Screen", push notifications.
- **System Theme Detection**: ThemeProvider defaults to system preference with light/dark/system options.

### Technical Implementations
- **Frontend**: Modular component architecture, real profile photo uploads.
- **Backend**: Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, PostgreSQL (Neon serverless), RESTful API with Replit Auth middleware. Graceful shutdown handlers to prevent port conflicts.
- **Database**: Neon Serverless PostgreSQL with UUID primary keys, `createdAt`/`updatedAt` timestamps, Drizzle Kit for migrations. Added retry logic and graceful error handling for database connections.
- **Authentication**: Replit Auth OAuth (supports Google, Apple, GitHub, X, email). All users must authenticate via OAuth before using the platform. Invite link users are prompted to sign in after accepting terms. Dynamic strategy registration for custom domains with security allowlist (auto-detects and registers OAuth strategies for authorized domains only). Requires CUSTOM_DOMAINS environment variable for production custom domains (e.g., `CUSTOM_DOMAINS=peacepad.ca`).
- **Terms & Conditions**: Mandatory acceptance flow with Non-Disclosure Agreement (NDA) for all users. First-time users must accept terms via modal dialog before accessing the platform. Terms acceptance tracked via `termsAcceptedAt` timestamp in user profile.
- **Partnership Model**: Invite code system (unique 6-digit alphanumeric) for creating co-parenting partnerships, supporting multiple partnerships. Privacy-first with no user directory.
- **WebRTC Real-Time Communication**: WebSocket signaling server for multi-user voice/video calls (2-12 participants), STUN server configuration, role-based negotiation, offer caching. Unauthenticated join flow for guests.
- **AI Integration**:
    - **Production Model**: GPT-3.5-turbo (75x cheaper than GPT-4, ~$0.002/1K messages vs $0.15/1K)
    - **Tone Analysis**: Real-time message tone analysis (calm, cooperative, neutral, frustrated, defensive, hostile) with AI rewording suggestions. Low temperature (0.3) for consistency.
    - **Scheduling Conflict Detection**: AI identifies scheduling overlaps in shared calendars.
    - **AI Listening (Opt-in)**: Real-time speech analysis during calls using Web Audio API, Whisper for transcription, and emotional tone analysis with visual feedback (MoodRing).
    - **Cost Optimization**: 
      - Dev mode protection with enhanced mock AI (30+ contextual responses covering all tones and scenarios)
      - Response caching (`node-cache` with 5-minute TTL)
      - Token budget controls (512 token cap)
      - Frontend debounce (1.5-second) for typing
      - Usage logging for cost tracking
- **Security**: Secure session cookies, CSRF protection, API authentication, user-scoped data access, Zod schema validation, secure WebSocket signaling.

### Feature Specifications
- **Real-time Messaging**: Conversation scoping with `recipientId` for 1:1 privacy.
- **Shared Custody Calendar**: Event management with AI conflict detection, enhanced fields (location, child name, recurring patterns).
- **Expense Tracking**: Receipt upload, automatic splitting, payment status tracking, categories.
- **Shared Tasks & To-Dos**: Create, view, and manage shared co-parenting tasks with title, due date, completion status.
- **Emotional Intelligence Features (Opt-in)**: Clippy 2.0 animated mascot, contextual hints, daily affirmations, smart mood check-ins.
- **Find Support Directory**: Multi-category resource database (Crisis, Therapists, Government, Family, Legal) with free/low-cost tags, OpenStreetMap Nominatim API for geocoding and location-based search, filter system, maps integration, and multi-language support.

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-3.5-turbo (via Replit AI Integrations) for cost-effective AI capabilities in production. Enhanced mock AI with 30+ responses for development testing.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Authentication**: OAuth 2.0 / OpenID Connect provider.
- **OpenStreetMap Nominatim API**: Geocoding and location data for the support directory.

### Key NPM Packages
- **UI/UX**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`, `qrcode.react`.
- **Data Management**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-zod`, `zod`.
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple`.
- **Development**: `vite`, `typescript`, `tsx`, `wouter`.
- **File Upload**: `multer`.
- **AI Optimization**: `node-cache`.

## Deployment Architecture

### Environment Separation Strategy
PeacePad uses **separate Replit deployments** for production and development to ensure security, data isolation, and regulatory compliance.

#### Production Deployment (peacepad.ca)
- **Purpose**: Live application for end users
- **Domains**: `peacepad.ca`, `support.peacepad.ca`
- **Database**: Production PostgreSQL (Neon)
- **Environment Variables**:
  - `CUSTOM_DOMAINS=peacepad.ca,support.peacepad.ca`
  - All production API keys (OpenAI, etc.)
  - `SESSION_SECRET` (production-specific)
- **Security**: 
  - Strict domain allowlist
  - Production-only user accounts
  - No test data
  - Regular backups enabled

#### Development Deployment (dev.peacepad.ca)
- **Purpose**: Testing and feature development
- **Domains**: `dev.peacepad.ca`
- **Database**: Separate development PostgreSQL database
- **Environment Variables**:
  - `CUSTOM_DOMAINS=dev.peacepad.ca`
  - Development/test API keys
  - `SESSION_SECRET` (dev-specific, different from production)
- **Features**:
  - Test data and dummy accounts
  - Enhanced logging and debugging
  - Can be reset without affecting production

### Security Benefits of Separation
1. **Session Isolation**: Users authenticated on production cannot access development (and vice versa)
2. **Data Protection**: Production user data never mixes with test data
3. **Attack Surface Reduction**: Vulnerabilities in dev environment cannot compromise production
4. **Compliance**: Meets security requirements for healthcare/legal data handling
5. **Cookie Scoping**: Each environment has isolated session cookies

### Deployment Configuration

#### Required Environment Variables (Production)
```
CUSTOM_DOMAINS=peacepad.ca,support.peacepad.ca
DATABASE_URL=<production-database-connection-string>
SESSION_SECRET=<production-secret>
OPENAI_API_KEY=<production-key>
REPLIT_DOMAINS=<auto-populated-by-replit>
```

#### Required Environment Variables (Development)
```
CUSTOM_DOMAINS=dev.peacepad.ca
DATABASE_URL=<development-database-connection-string>
SESSION_SECRET=<dev-secret>
OPENAI_API_KEY=<development-key>
REPLIT_DOMAINS=<auto-populated-by-replit>
```

### Port Configuration
- **External Port**: 80 (HTTPS handled by Replit)
- **Internal Port**: 5000 (Express server)
- All other ports (3000, 3001, etc.) are internal development tools and should not be exposed

### DNS Configuration
Point custom domains to Replit deployments:
- `peacepad.ca` → Production Replit deployment
- `support.peacepad.ca` → Production Replit deployment (same app)
- `dev.peacepad.ca` → Development Replit deployment

### Migration Strategy
When deploying database changes:
1. Test schema changes in development first
2. Use `npm run db:push` in dev to verify migrations
3. Only after successful testing, deploy to production
4. Never manually edit `drizzle.config.ts`
5. Use `npm run db:push --force` if data-loss warnings appear (after backing up data)