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
- **Data Models**: Users, Guest Sessions, Usage Metrics, Messages (with AI tone analysis), Notes, Tasks, Child Updates, Pets, Expenses, Events (with AI conflict detection), Sessions, Push Subscriptions.
- **Soft Authentication**: Guest entry with unique localStorage session ID, no email/password required.
- **Conversation Scoping**: Messages include `recipientId` for 1:1 privacy.

### AI Integration
- **OpenAI Integration**: GPT-3.5-turbo for real-time message tone analysis (calm, cooperative, neutral, frustrated, defensive, hostile, with rewording suggestions) and scheduling conflict detection.
- **Tone Analysis Design**: Low temperature (0.3) for consistent analysis, structured prompt engineering.
- **AI Listening (Opt-in)**: Real-time speech analysis during calls with dual-consent. Uses Web Audio API, Whisper for transcription, and GPT-3.5-turbo for emotional tone analysis. Provides visual feedback (MoodRing) and session mood summaries.

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

### Contact Management (AppClose-style Architecture)
- **Contact CRUD**: Full create, read, update, delete operations for contacts.
- **Permission System**: Per-contact permissions (audio/video/SMS/recording/AI tone analysis).
- **Nickname Support**: Optional custom nicknames for contacts.
- **Phone Number Privacy**: User-level `sharePhoneWithContacts` toggle (default: false).
  - Phone numbers only visible when: (1) Mutual contact relationship AND (2) Peer has opted in to share.
- **Contact Selector**: Integrated into ChatInterface with search and permission indicators.
- **Auth-Gated Queries**: Contacts query enabled only after authentication (`enabled: !!user`).

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