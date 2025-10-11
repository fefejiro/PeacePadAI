# PeacePad - Co-Parenting Communication Platform

## Overview
PeacePad is an AI-powered co-parenting communication platform designed to foster constructive dialogue between separated parents. It utilizes AI for tone analysis to reduce tension and promote effective communication. Inspired by applications like Linear, Headspace, and Notion, PeacePad offers a calming and accessible interface, providing real-time messaging, shared task management, collaborative note-taking, and child update tracking. The platform aims to facilitate smoother co-parenting relationships and has potential for broader market adoption in family communication tools.

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
- **Data Models**: Users, Guest Sessions, Usage Metrics, Messages (with AI tone analysis), Notes, Tasks, Child Updates, Pets, Expenses, Events (with AI conflict detection), Sessions.
- **Soft Authentication**: Guest entry with optional display name, unique localStorage session ID (14-day persistence), auto-generated guest IDs, no email/password required.

### Progressive Web App (PWA)
- **Configuration**: `manifest.json`, service worker for offline support, "Add to Home Screen" capability, standalone display mode.
- **Offline Capabilities**: Caches essential pages and assets; chat UI, tone feedback, and dashboard function offline with cached data.

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
- **Voice/Video Calling**: WebRTC peer connections, STUN server configuration, audio/video modes, call controls (mute, camera, end call), optional call recording (WebM).

### Therapist Directory
- **Geocoding & Location Detection**: OpenStreetMap Nominatim API for addresses and postal codes, Canadian postal code fallback, country detection, "Use My Location" feature.
- **Distance Calculation**: Haversine formula for accurate geographic distance, server-side km calculation, client-side miles-to-km conversion.
- **Unit Handling**: km for Canadian locations, miles for US/Other; slider range adjusts based on location.
- **Maps Integration**: "Get Directions" links to native Apple Maps (iOS) or Google Maps (Android/Desktop).

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