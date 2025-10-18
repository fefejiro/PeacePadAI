# PeacePad - Co-Parenting Communication Platform

## Overview
PeacePad is an AI-powered co-parenting communication platform designed to foster constructive dialogue between separated parents. It utilizes AI for tone analysis to reduce tension and promote effective communication. Inspired by applications like Linear, Headspace, and Notion, PeacePad offers real-time messaging, shared task management, collaborative note-taking, and child update tracking, aiming to facilitate smoother co-parenting relationships and broader market adoption.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 18, 2025)
- **CRITICAL FIX - Partnership Data Sharing**: Fixed all shared data queries (tasks, notes, child updates, pets, expenses, events) to return data from ALL partnered users, not just the logged-in user. This enables proper co-parent collaboration where both parents can see all shared information.
- **Database Safety Enhancement**: Added unique index on `users.invite_code` column to prevent race conditions during concurrent invite code generation and ensure database-level uniqueness enforcement.
- **CRITICAL FIX - Invite Code Preservation**: Fixed bug where invite codes were regenerated during profile updates (photo upload, name change). Codes now persist permanently after initial generation, preventing partnership join failures.
- **Fixed Invite Code Database Bug**: All 178 users now have unique 6-digit invite codes properly saved to database. Ran backfill script to assign codes to existing users.
- **Mobile-Responsive Chat Interface**: Added mobile drawer for conversation list, optimized touch targets (44px minimum), sticky input area at bottom, responsive button sizing.
- **Consent Agreement Flow**: Added comprehensive legal consent agreement (communication recording, AI analysis, data retention, export rights) that appears after intro slideshow and before onboarding.

## Testing Partnership Flow (Critical)
**IMPORTANT**: When testing the partnership invite system, follow these steps exactly:

### Parent A (First User):
1. Open a fresh incognito/private window
2. Complete full onboarding (name, photo upload, all 3 steps)
3. Click "Continue to PeacePad" to save your account
4. Go to Settings → copy your 6-digit invite code
5. Share this code with Parent B (via text/email, NOT by sharing the browser window)

### Parent B (Second User):
1. Open a SEPARATE incognito/private window (different browser or different computer)
2. Do NOT copy-paste the URL from Parent A's browser
3. Complete your own onboarding with a different name
4. Click "Continue to PeacePad" to save your account
5. Click "Add Co-Parent" button
6. Enter Parent A's invite code (the one they shared with you)
7. Partnership should be created successfully

### Common Mistakes:
- ❌ Sharing the URL from Parent A's session → Parent B will see Parent A's profile
- ❌ Sharing the invite code BEFORE clicking "Continue to PeacePad" → Code doesn't exist yet in database
- ❌ Using the same browser/incognito session → Cookies will mix the sessions
- ✅ Each person completes onboarding separately, then Parent B enters Parent A's code

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query, Radix UI with shadcn/ui, Tailwind CSS.
- **Design System**: Custom calming color palette, Inter and JetBrains Mono fonts, accessibility-first.
- **Component Architecture**: Modular design with shared and feature-specific components.
- **Onboarding**: Streamlined 3-step flow: (1) Welcome/real name + photo upload, (2) Optional child/relationship details, (3) Invite code display with QR code & shareable link.
- **Photo Upload**: Real profile photo uploads via /api/profile-upload endpoint (5MB max, validation for image types). Replaces emoji picker system.
- **PWA**: `manifest.json`, service worker for offline support, "Add to Home Screen", push notifications.

### Backend Architecture
- **Technology Stack**: Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, PostgreSQL (Neon serverless).
- **API Design**: RESTful API, Replit Auth middleware, consistent error handling.
- **Data Models**: Users (with invite codes, relationship_type, child_name), Partnerships (co-parenting relationships), Guest Sessions, Usage Metrics, Messages (with AI tone analysis), Notes, Tasks, Child Updates, Pets, Expenses, Events (with AI conflict detection), Sessions, Push Subscriptions.
- **Soft Authentication**: Guest entry with unique localStorage session ID, no email/password required.
- **Partnership Model**: Each user has a unique 6-digit invite code. Users enter the same code to create a co-parenting partnership. Supports multiple partnerships (for step-parents).
- **Conversation Scoping**: Messages include `recipientId` for 1:1 privacy between co-parents.

### AI Integration
- **OpenAI Integration**: GPT-4o-mini (via Replit AI Integrations) for real-time message tone analysis (calm, cooperative, neutral, frustrated, defensive, hostile, with rewording suggestions) and scheduling conflict detection.
- **Tone Analysis Design**: Low temperature (0.3) for consistent analysis, structured prompt engineering.
- **AI Listening (Opt-in)**: Real-time speech analysis during calls with dual-consent. Uses Web Audio API, Whisper for transcription, and GPT-4o-mini for emotional tone analysis. Provides visual feedback (MoodRing) and session mood summaries.

### AI Cost Optimization
- **Dev Mode Protection**: Automatic mock responses in development (`NODE_ENV !== "production"`) to prevent token usage during testing.
  - Set `ALLOW_DEV_AI=true` to enable real AI calls in development for testing purposes.
- **Response Caching**: Implements `node-cache` with 5-minute TTL (configurable via `CACHE_TTL`) to reuse analysis for identical content.
  - Reduces duplicate API calls by ~50% in production.
- **Token Budget Controls**: Configurable max completion tokens via `MAX_COMPLETION_TOKENS` (default: 128-200, capped at 512).
- **Frontend Debounce**: 1.5-second debounce on typing before auto-previewing tone analysis.
  - Reduces API calls by ~20% by waiting for users to finish typing.
- **Usage Logging**: Optional token estimation logs via `LOG_TOKEN_USAGE=true` for cost tracking.
- **Expected Savings**: 100% in dev (mock responses), 40-60% in production (caching + debounce + token caps).

### Database Architecture
- **Provider**: Neon Serverless PostgreSQL.
- **Schema Design**: UUID primary keys, `createdAt`/`updatedAt` timestamps, foreign key relationships, JSONB for session storage.
- **Migration Strategy**: Drizzle Kit for schema migrations.

### Development Workflow
- **Build Pipeline**: Vite for frontend, esbuild for backend, TypeScript compilation, shared types.

### WebRTC Real-Time Communication
- **WebSocket Signaling Server**: Unified server for chat and WebRTC signaling.
- **Real-Time Notifications**: Partnership join events broadcast via WebSocket with toast notifications.
- **Session-Based Multi-User Calls**: Supports 2-12 participants with 6-digit join codes (via /call/:code).
- **Role-Based Negotiation**: Handles SDP glare in multi-user scenarios.
- **Media-Ready Gating**: Ensures media tracks are added before SDP negotiation.
- **Offer Caching System**: Prevents dropped negotiations from race conditions.
- **Voice/Video Calling**: WebRTC peer connections, STUN server configuration, call controls.
- **Unauthenticated Join Flow**: Guests can join calls with a temporary ID.

### Emotional Intelligence Features (PeacePadAI) - OPT-IN
- **Clippy 2.0 Animated Mascot**: Interactive assistant with contextual hints.
- **Contextual Hints System**: User-controlled hints toggle.
- **Daily Affirmations**: JSON-driven library with themed messages.
- **Smart Mood Check-Ins**: Activity-aware emotional reflection system.

### Navigation & Organization
- **Sidebar Structure**: Reorganized into "Communicate", "Organize", and "Support" sections.

### Shared Custody Calendar
- **Event Management**: Create, view, and manage custody schedules with AI conflict detection.
- **Enhanced Fields**: Location, Child Name, Recurring Patterns, Notes.
- **AI Conflict Detection**: Identifies scheduling overlaps and provides suggestions.

### Expense Tracking
- **Receipt Upload**: Upload images/PDFs with automatic storage.
- **Automatic Splitting**: Configurable split percentages.
- **Payment Status Tracking**: Pending, Paid, Settled.
- **Categories**: Childcare, Medical, Education, Activities, Food, Clothing.

### Shared Tasks & To-Dos
- **Task Management**: Create, view, and manage shared co-parenting tasks.
- **Task Fields**: Title, Due Date, Completion Status.
- **Separated Views**: "To Do" and "Completed" sections.

### Partnership Model (Privacy-First Co-Parenting)
- **Invite Code System**: Each user has a unique 6-digit alphanumeric invite code (auto-generated on signup).
- **Partnership Creation**: Users enter the same invite code to create a co-parenting partnership (supports multiple partnerships for step-parents).
- **Privacy Protection**: No user directory - connections only via invite codes, eliminating the 154-user privacy leak from the old /api/available-users endpoint.
- **Permission System**: Partnership-level permissions (audio/video/recording/AI tone analysis) stored per partnership.
- **Co-Parent Selector**: Dropdown in ChatInterface to switch between multiple co-parents (auto-loads first partnership).
- **Code Management**: Users can view, copy, and regenerate their invite code from Settings.
- **Shareable Invite Links**: QR code + link (peacepad.app/join/CODE) shown in onboarding Step 3 with pre-written message template.
- **/join/:code Flow**: Auto-joins partnership if authenticated, redirects to onboarding if not (stores code in localStorage for post-signup join).
- **JoinPartnershipPage**: Dedicated page for handling /join/:code links with auto-join and user feedback.
- **Real-Time Join Notifications**: WebSocket toast notifications when someone uses your invite code to create a partnership.
- **Phone Number Privacy**: User-level `sharePhoneWithContacts` toggle (default: false) - phone numbers only visible to connected co-parents who have opted in.

### Find Support Directory
- **Comprehensive Resource Database**: Multi-category support system (Crisis, Therapists, Government, Family, Legal).
- **Free & Low-Cost Services**: Resources tagged with `isFree` flag.
- **Geocoding & Location Detection**: OpenStreetMap Nominatim API for location-based search, including partial postal code support.
- **Filter System**: Tab-based filtering by resource type.
- **Maps Integration**: "Get Directions" links.
- **Multi-Language Support**: Resources include language availability.

### Security Considerations
- **Authentication Security**: Secure session cookies, CSRF protection.
- **API Security**: Authentication for data endpoints, user-scoped data access, Zod schema validation.
- **WebRTC Security**: STUN servers, secure WebSocket signaling.

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-3.5-turbo.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Authentication**: OAuth 2.0 / OpenID Connect provider.
- **OpenStreetMap Nominatim API**: Geocoding and location data for the support directory.

### Key NPM Packages
- **UI/UX**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`, `qrcode.react`.
- **Data Management**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-zod`, `zod`.
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple`.
- **Development**: `vite`, `typescript`, `tsx`, `wouter`.
- **File Upload**: `multer` for profile photos, receipts, and media attachments.
- **AI Optimization**: `node-cache` for response caching.

## Environment Variables

### AI Configuration
- `NODE_ENV`: Set to `development` for dev mode, `production` for deployed app.
- `ALLOW_DEV_AI`: (Optional) Set to `true` to enable real AI calls in development.
- `MAX_COMPLETION_TOKENS`: (Optional) Maximum tokens per AI completion (default: varies by endpoint, capped at 512).
- `CACHE_TTL`: (Optional) Cache duration in seconds for AI responses (default: 300 / 5 minutes).
- `LOG_TOKEN_USAGE`: (Optional) Set to `true` to log estimated token usage for cost tracking.
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key (managed by Replit AI Integrations).
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI base URL (managed by Replit AI Integrations).