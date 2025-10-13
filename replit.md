# PeacePad - Co-Parenting Communication Platform

## Overview
PeacePad is an AI-powered co-parenting communication platform designed to foster constructive dialogue between separated parents. It utilizes AI for tone analysis to reduce tension and promote effective communication. Inspired by applications like Linear, Headspace, and Notion, PeacePad offers a calming and accessible interface, providing real-time messaging, shared task management, collaborative note-taking, and child update tracking. The platform aims to facilitate smoother co-parenting relationships and has potential for broader market adoption in family communication tools.

### Onboarding Experience
- **Introductory Slideshow**: 7-slide welcome experience for first-time visitors; covers platform purpose (peaceful communication), key features (chat, scheduling, expenses, pet care), mission (emotional intelligence), and therapist directory; uses embla-carousel with smooth transitions, skip button, progress indicators, and localStorage "hasSeenIntro" flag to show once per visitor; mobile-optimized with responsive design; automatically bypassed for users with pending call join codes.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18, TypeScript, Vite, Wouter for routing, TanStack Query for state management, Radix UI primitives with shadcn/ui, Tailwind CSS.
- **Design System**: Custom calming color palette, Inter and JetBrains Mono fonts, comprehensive theme support, accessibility-first approach.
- **Component Architecture**: Modular design with shared UI components, feature-specific components, and page-level components.

### Backend Architecture
- **Technology Stack**: Node.js, Express.js, TypeScript, ES Modules, Drizzle ORM, PostgreSQL (Neon serverless).
- **API Design**: RESTful API, Replit Auth middleware, consistent error handling, request/response logging.
- **Data Models**: Users, Guest Sessions, Usage Metrics, Messages (with AI tone analysis and recipientId for 1:1 conversations), Notes, Tasks, Child Updates, Pets, Expenses, Events (with AI conflict detection), Sessions, Push Subscriptions.
- **Soft Authentication**: Guest entry with optional display name, unique localStorage session ID (14-day persistence), auto-generated guest IDs, no email/password required.
- **Conversation Scoping**: Messages include recipientId for proper 1:1 conversation privacy; auto-selected for 2-user scenarios, explicit selection required for 3+ users; retrieval filtered by `WHERE senderId = userId OR recipientId = userId`.

### Progressive Web App (PWA)
- **Configuration**: `manifest.json`, service worker for offline support, "Add to Home Screen" capability, standalone display mode.
- **Offline Capabilities**: Caches essential pages and assets; chat UI, tone feedback, and dashboard function offline with cached data.
- **Push Notifications**: Service worker-based push notifications for incoming calls; user-controlled subscription management, browser notification permission handling, backend storage of push subscriptions, web-push with VAPID keys (environment variables for production, development fallback keys included).

### AI Integration
- **OpenAI Integration**: GPT-3.5-turbo for real-time message tone analysis (calm, cooperative, neutral, frustrated, defensive, hostile, with rewording suggestions) and scheduling conflict detection.
- **Tone Analysis Design**: Low temperature (0.3) for consistent analysis, structured prompt engineering, graceful fallback.
- **Scheduling Conflict Detection**: Time-based overlap detection, AI analysis of patterns, actionable suggestions, visual warnings.

### Database Architecture
- **Provider**: Neon Serverless PostgreSQL with WebSocket-based connection pooling.
- **Schema Design**: UUID primary keys, `createdAt`/`updatedAt` timestamps, foreign key relationships, JSONB for session storage.
- **Migration Strategy**: Drizzle Kit for schema migrations, shared schema definitions (`/shared/schema.ts`).

### Development Workflow
- **Build Pipeline**: Vite for frontend, esbuild for backend, TypeScript compilation checking, shared types via `/shared`.
- **Path Aliases**: `@/*` (frontend), `@shared/*` (shared types), `@assets/*` (static assets).

### WebRTC Real-Time Communication
- **WebSocket Signaling Server**: Unified server for chat and WebRTC signaling, handles multiple connections, ICE candidate exchange.
- **Session-Based Multi-User Calls**: Session rooms support 2-12 participants; users join sessions via 6-digit code, server manages session user lists, broadcasts peer-joined/peer-left events.
- **Role-Based Negotiation**: Existing session members create offers to newcomers, newcomers wait to receive offers and send answers (prevents SDP glare in multi-user scenarios).
- **Media-Ready Gating**: Async getUserMedia initialization protected by `isMediaReady` flag; peer connections queued in `pendingPeersRef` if media not ready, processed after initialization to ensure tracks are always added before SDP negotiation.
- **Offer Caching System**: Incoming offers cached in `pendingOffersRef` if peer connection doesn't exist yet; offers applied and answered immediately after peer connection creation, preventing dropped negotiations from race conditions.
- **Voice/Video Calling**: WebRTC peer connections (Map for multiple peers), STUN server configuration, audio/video modes, call controls (mute, camera, end call), optional call recording (WebM).
- **Unauthenticated Join Flow**: Session lookup endpoint is public (no auth required); unauthenticated users can access shared call links, view session details and preview; when joining, stores pending_join_code in localStorage, redirects to landing for guest creation, auto-shows guest entry form, then auto-redirects to call preview after authentication.
- **Manual Join**: "Join Call" sidebar option allows manual 6-digit session code entry for both authenticated and unauthenticated users.

### Emotional Intelligence Features (PeacePadAI)
- **Clippy 2.0 Animated Mascot**: Interactive paperclip assistant with idle bounce and dance animations, provides contextual hints, responds to user actions.
- **Contextual Hints System**: User-controlled hints toggle in Settings, localStorage-based state management, helpful guidance for first-time features.
- **Daily Affirmations**: JSON-driven affirmation library with themes (patience, peace, multicultural, communication, coparenting), gradient banner display, dismissible with daily rotation.
- **Smart Mood Check-Ins**: Activity-aware emotional reflection system; ActivityProvider tracks messaging/call/navigation activity with 3-minute dormant threshold; localStorage-based state ('active'/'dormant'); MoodCheckIn NEVER interrupts during active sessions, only shows via 30s polling when dormant; empathetic prompts library with reflection, breathing, and transition phrases; TransitionPrompt shows 4s supportive message when moving active→dormant before mood dialog; emoji-based mood selection with personalized responses; once-per-day check-ins; no fallback timer to prevent interruptions.

### Find Support Directory (Support Resources)
- **Comprehensive Resource Database**: Multi-category support system including Crisis (24/7 helplines), Therapists (licensed professionals), Government Services (free mental health programs), Family Services (community-based support), and Legal Resources (family law assistance).
- **Resource Types & Classification**: 
  - Crisis: 24/7 emergency support and helplines (988, Kids Help Phone, Crisis Text Line, etc.)
  - Therapists: Licensed mental health professionals with ratings, insurance acceptance, and specialties
  - Government: Free/low-cost public services (CAMH, Ontario Mental Health Helpline, CMHA Toronto, etc.)
  - Family Services: Community-based family support and parenting programs (Family Service Toronto, YWCA, Woodgreen, etc.)
  - Legal: Family law resources, free legal clinics, mediation services (FLIC, Pro Bono Ontario, JFCY, etc.)
- **Free & Low-Cost Services**: All resources tagged with `isFree` flag; crisis and government services always free; family services include sliding scale options.
- **Geocoding & Location Detection**: OpenStreetMap Nominatim API for addresses and postal codes, Canadian postal code fallback, country detection, "Use My Location" feature.
- **Distance Calculation**: Haversine formula for accurate geographic distance, server-side km calculation, client-side miles-to-km conversion.
- **Unit Handling**: km for Canadian locations, miles for US/Other; slider range adjusts based on location.
- **Filter System**: Tab-based filtering by resource type (All, Crisis, Therapists, Family Services, Legal); crisis resources always shown regardless of distance.
- **Maps Integration**: "Get Directions" links to native Apple Maps (iOS) or Google Maps (Android/Desktop).
- **Multi-Language Support**: Resources include language availability (English, French, 100+ languages via interpretation for some services).

### Security Considerations
- **Authentication Security**: Secure session cookies (httpOnly, secure), 14-day TTL, session encryption, CSRF protection.
- **API Security**: Authentication for data endpoints, user-scoped data access, Zod schema validation, error message sanitization.
- **WebRTC Security**: STUN servers for NAT traversal, secure WebSocket signaling.

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-3.5-turbo for AI features.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Authentication**: OAuth 2.0 / OpenID Connect provider.

### Key NPM Packages
- **UI/UX**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `lucide-react`.
- **Data Management**: `@tanstack/react-query`, `drizzle-orm`, `drizzle-zod`, `zod`.
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple`.
- **Development**: `vite`, `typescript`, `tsx`, `wouter`.