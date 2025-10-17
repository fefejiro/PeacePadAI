# PeacePad - Co-Parenting Communication Platform

## Overview
PeacePad is an AI-powered co-parenting communication platform designed to foster constructive dialogue between separated parents. It utilizes AI for tone analysis to reduce tension and promote effective communication. Inspired by applications like Linear, Headspace, and Notion, PeacePad offers real-time messaging, shared task management, collaborative note-taking, and child update tracking, aiming to facilitate smoother co-parenting relationships and broader market adoption.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query, Radix UI with shadcn/ui, Tailwind CSS.
- **Design System**: Custom calming color palette, Inter and JetBrains Mono fonts, accessibility-first.
- **Component Architecture**: Modular design with shared and feature-specific components.
- **Onboarding**: Streamlined 3-slide introductory slideshow using `embla-carousel`.
- **PWA**: `manifest.json`, service worker for offline support, "Add to Home Screen", push notifications.

### Backend Architecture
- **Technology Stack**: Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, PostgreSQL (Neon serverless).
- **API Design**: RESTful API, Replit Auth middleware, consistent error handling.
- **Data Models**: Users (with invite codes), Partnerships (co-parenting relationships), Guest Sessions, Usage Metrics, Messages (with AI tone analysis), Notes, Tasks, Child Updates, Pets, Expenses, Events (with AI conflict detection), Sessions, Push Subscriptions.
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
- **Session-Based Multi-User Calls**: Supports 2-12 participants with 6-digit join codes.
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
- **JoinPartnershipDialog**: UI component for entering a co-parent's invite code to establish partnership.
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
- **UI/UX**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data Management**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-zod`, `zod`.
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple`.
- **Development**: `vite`, `typescript`, `tsx`, `wouter`.
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