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
- **PWA**: `manifest.json`, service worker for offline support, "Add to Home Screen", push notifications.
- **System Theme Detection**: ThemeProvider defaults to system preference with light/dark/system options.

### Technical Implementations
- **Frontend**: Modular component architecture, real profile photo uploads.
- **Backend**: Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, PostgreSQL (Neon serverless), RESTful API with Replit Auth middleware.
- **Database**: Neon Serverless PostgreSQL with UUID primary keys, `createdAt`/`updatedAt` timestamps, Drizzle Kit for migrations. Added retry logic and graceful error handling for database connections.
- **Authentication**: Replit Auth OAuth (supports Google, Apple, GitHub, X, email). All users must authenticate via OAuth before using the platform.
- **Terms & Conditions**: Mandatory acceptance flow with Non-Disclosure Agreement (NDA) for all users. First-time users must accept terms via modal dialog before accessing the platform. Terms acceptance tracked via `termsAcceptedAt` timestamp in user profile.
- **Partnership Model**: Invite code system (unique 6-digit alphanumeric) for creating co-parenting partnerships, supporting multiple partnerships. Privacy-first with no user directory.
- **WebRTC Real-Time Communication**: WebSocket signaling server for multi-user voice/video calls (2-12 participants), STUN server configuration, role-based negotiation, offer caching. Unauthenticated join flow for guests.
- **AI Integration**:
    - **Tone Analysis**: GPT-4o-mini for real-time message tone analysis (calm, cooperative, neutral, frustrated, defensive, hostile) and rewording suggestions. Low temperature (0.3) for consistency.
    - **Scheduling Conflict Detection**: AI identifies scheduling overlaps in shared calendars.
    - **AI Listening (Opt-in)**: Real-time speech analysis during calls using Web Audio API, Whisper for transcription, and GPT-4o-mini for emotional tone analysis with visual feedback (MoodRing).
    - **Cost Optimization**: Dev mode protection (mock responses), response caching (`node-cache` with 5-minute TTL), token budget controls, frontend debounce (1.5-second) for typing, and usage logging.
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
- **OpenAI API**: GPT-4o-mini (via Replit AI Integrations) for AI capabilities.
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