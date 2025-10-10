# PeacePad - Co-Parenting Communication Platform

## Overview

PeacePad is a co-parenting communication platform designed to facilitate constructive dialogue between separated parents. The application emphasizes emotional intelligence through AI-powered tone analysis, helping users communicate more effectively while reducing tension. Built with a calming, accessible interface inspired by Linear, Headspace, and Notion, PeacePad provides real-time messaging, shared task management, collaborative note-taking, and child update tracking.

## Recent Changes (October 10, 2025)

**Latest Updates (Session):**
- WhatsApp-like chat with multimedia support:
  - File attachments: Images, videos, audio, and documents (100MB limit)
  - In-chat audio recording: Voice messages using MediaRecorder API
  - In-chat video recording: Video messages with live camera preview
  - Media message display: Images (max-h-96), audio player, video player, document downloads
  - File upload endpoint: /api/chat-attachments with multer handling
  - Message types: text, image, audio, video, document with proper rendering
  - WebSocket fix: Reliable sessionId fallback (localStorage → user.id) for real-time updates
- Therapist directory with real-time web-based therapist search
- Postal code/address geocoding using OpenStreetMap Nominatim API
- Automatic Canadian unit detection (km for Canada, miles for US/other)
- Haversine distance calculation for accurate therapist proximity sorting
- Canadian postal code fallback (uses Toronto city center when postal code data unavailable)
- Distance filtering with unit conversion (miles→km) for accurate results
- Maps integration (Apple Maps on iOS, Google Maps elsewhere)
- 8 real Toronto-area therapists from web search results hardcoded for demo

**Previous Updates:**
- Enhanced AI tone detection from 4 to 6 categories: calm, cooperative, neutral, frustrated, defensive, hostile
- Vulgar/offensive language now automatically classified as "hostile" tone
- Profile picture support: emoji picker and image upload in settings
- Display name improvements: proper fallbacks (displayName → firstName lastName → firstName → "Guest User")
- Real-time messaging via WebSocket: messages appear instantly for all users
- Fixed WebSocket multi-connection support: ChatInterface and VideoCallDialog can coexist
- Shareable call sessions backend: 6-digit codes with collision retry logic (5 attempts)
- Smart Scheduling Dashboard with event creation and calendar view
- AI-powered conflict detection using OpenAI for scheduling overlaps
- WebRTC voice/video calling with WebSocket signaling server
- Optional call recording functionality using MediaRecorder API
- Integrated call buttons into chat interface for easy access
- Soft Authentication for frictionless onboarding (no email/password required)
- PWA deployment with offline support and "Add to Home Screen" capability
- Pet management and expense tracking modules fully integrated

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized production builds
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack Query (React Query) for server state management
- **UI Framework:** Radix UI primitives with shadcn/ui component library
- **Styling:** Tailwind CSS with custom design tokens for light/dark themes

**Design System:**
- Custom color palette emphasizing calming aesthetics (slate blues, sage greens, soft corals)
- Typography using Inter for body text and JetBrains Mono for timestamps
- Comprehensive theme support with CSS custom properties
- Accessibility-first approach using Radix UI primitives

**Component Architecture:**
- Modular component design with example components for development
- Shared UI components in `/client/src/components/ui/`
- Feature components in `/client/src/components/`
- Page-level components in `/client/src/pages/`

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript with ES Modules
- **Database ORM:** Drizzle ORM
- **Database:** PostgreSQL (via Neon serverless)
- **Authentication:** Soft Authentication (guest/nickname entry)
- **Session Management:** Express sessions with PostgreSQL storage (14-day TTL)

**API Design:**
- RESTful API endpoints under `/api` prefix
- Protected routes using Replit Auth middleware
- Error handling middleware for consistent error responses
- Request/response logging for API endpoints

**Data Models:**
- **Users:** Profile information with guest/nickname support
- **Guest Sessions:** Session tracking with localStorage sync (14-day expiry)
- **Usage Metrics:** Analytics tracking per session (messages, tone analysis, searches, calls)
- **Messages:** Multimedia chat messages with AI tone analysis
  - Text content with tone analysis (tone, toneSummary, toneEmoji, rewordingSuggestion)
  - Multimedia support (messageType: text, image, audio, video, document)
  - File metadata (fileUrl, fileName, fileSize, mimeType, duration)
- **Notes:** Shared notes between co-parents
- **Tasks:** Collaborative task management with due dates and completion status
- **Child Updates:** Important updates about children
- **Pets:** Pet tracking with vet appointments and custody schedules
- **Expenses:** Expense tracking with categorization and split payment support
- **Events:** Scheduling events with AI conflict detection (type: pickup, dropoff, school, medical, activity, other)
- **Sessions:** Server-side session storage for authentication

**Soft Authentication Flow:**
- Guest entry with optional display name
- Unique session ID stored in localStorage (14-day persistence)
- Auto-generated guest ID (e.g., "Guest123") for anonymous users
- Welcome back messages for returning visitors
- No email, password, or personal info required
- Usage metrics tracked per session for analytics

### Progressive Web App (PWA)

**PWA Configuration:**
- Manifest.json with app metadata (name, icons, theme colors)
- Service worker for offline caching and fast reloads
- "Add to Home Screen" support for Android, iOS, and desktop
- Standalone display mode with PeacePad blue theme (#3b82f6)
- **Note:** PWA icons (192x192 and 512x512) need to be added to /client/public/

**Offline Capabilities:**
- Service worker caches essential pages and assets
- Chat UI, tone feedback, and dashboard work offline with cached data
- Background sync for offline message queuing (future enhancement)

### AI Integration

**OpenAI Integration:**
- GPT-3.5-turbo for message tone analysis and scheduling conflict detection
- Real-time analysis of message emotional content
- Classification into six tone categories: calm, cooperative, neutral, frustrated, defensive, hostile
- Vulgar/offensive language automatically classified as "hostile" tone
- Brief summaries and rewording suggestions for negative tones
- Graceful fallback to "neutral" when OpenAI API unavailable
- AI-powered scheduling pattern analysis for conflict detection

**Tone Analysis Design:**
- Low temperature (0.3) for consistent, predictable analysis
- Structured prompt engineering for reliable categorization
- Graceful fallback to "neutral" on API errors
- Non-blocking analysis to maintain chat performance

**Scheduling Conflict Detection:**
- Time-based overlap detection for events
- AI analysis of scheduling patterns and logistics
- Actionable suggestions for resolving conflicts
- Visual conflict warnings with amber styling

### Database Architecture

**Database Provider:** Neon Serverless PostgreSQL
- WebSocket-based connection pooling for serverless environments
- Automatic connection management
- Environment-based configuration via DATABASE_URL

**Schema Design:**
- UUID primary keys for all entities
- Timestamp tracking (createdAt, updatedAt) for audit trails
- Foreign key relationships for data integrity
- JSONB for session storage (flexible session data structure)
- Text fields for user-generated content with appropriate length constraints

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Schema definitions in `/shared/schema.ts` for type-safe sharing between client and server
- Push-based migrations for rapid development

### Development Workflow

**Build Pipeline:**
- Vite for frontend development with HMR
- esbuild for backend bundling in production
- TypeScript compilation checking without emit
- Shared types between client and server via `/shared` directory

**Development Plugins:**
- Replit-specific tooling (cartographer, dev banner, runtime error overlay)
- Conditional plugin loading based on environment
- Source map support for debugging

**Path Aliases:**
- `@/*` maps to `/client/src/*` (frontend code)
- `@shared/*` maps to `/shared/*` (shared types)
- `@assets/*` maps to `/attached_assets/*` (static assets)

### WebRTC Real-Time Communication

**WebSocket Signaling Server:**
- Unified WebSocket server for both chat messaging and WebRTC call signaling
- Supports multiple connections per user with unique connection IDs
- Broadcasts new message notifications to all connected clients
- Handles WebRTC signaling for voice/video calls
- ICE candidate exchange for NAT traversal

**Voice/Video Calling:**
- WebRTC peer connections with STUN server configuration
- Audio-only and video call modes
- Call controls: mute, camera toggle, end call
- Optional call recording using MediaRecorder API
- Download recorded calls as WebM files

**Call Flow:**
- Peer connection created before getUserMedia to handle incoming offers
- Pending offer queue for race condition handling
- Proper ICE candidate exchange and media track negotiation
- Visual call timer and connection status indicators

### Therapist Directory

**Geocoding & Location Detection:**
- OpenStreetMap Nominatim API for free geocoding
- Postal code and address support with fallback mechanism
- Canadian postal code fallback: Falls back to "Toronto, Ontario, Canada" when Nominatim lacks postal code data
- Country detection: Uses Nominatim's `country_code === 'ca'` for reliable Canadian detection
- Reverse geocoding: "Use My Location" button reverse geocodes coordinates to determine country

**Distance Calculation:**
- Haversine formula for accurate geographic distance calculation
- Server-side distance calculation in kilometers
- Client-side unit conversion: Miles to km (`distance * 1.60934`) for non-Canadian users
- Results filtered by radius and sorted by proximity (closest first)

**Unit Handling:**
- Canadian locations: Display in kilometers (km)
- US/Other locations: Display in miles (mi)
- Slider range: 5-100 (km or miles based on location)
- Distance filtering: Server always filters in km after client conversion

**Data Source:**
- Currently: 8 real Toronto-area therapists from web search hardcoded
- Production: Would integrate with Psychology Today API or similar
- Therapist data includes: name, specialty, phone, address, coordinates, insurance, license info

**Maps Integration:**
- "Get Directions" opens native maps apps
- iOS: Apple Maps (`maps://`)
- Android/Desktop: Google Maps (`https://maps.google.com/`)

### Security Considerations

**Authentication Security:**
- Secure session cookies (httpOnly, secure flags)
- 14-day session TTL with automatic cleanup
- Session encryption via secret key
- CSRF protection through session-based authentication

**API Security:**
- Authentication required for all data endpoints
- User-scoped data access
- Input validation using Zod schemas
- Error message sanitization

**WebRTC Security:**
- STUN servers for NAT traversal (Google public STUN servers)
- Secure WebSocket connections for signaling
- Client-side media recording (not stored on server by default)

## External Dependencies

### Third-Party Services

**OpenAI API:**
- GPT-3.5-turbo model for natural language processing
- Tone analysis and emotional intelligence features
- Requires `OPENAI_API_KEY` environment variable

**Neon Database:**
- Serverless PostgreSQL hosting
- WebSocket-based connections
- Requires `DATABASE_URL` environment variable

**Replit Authentication:**
- OAuth 2.0 / OpenID Connect provider
- User identity management
- Requires `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET` environment variables

### Key NPM Packages

**UI/UX:**
- `@radix-ui/*` - Accessible component primitives
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Type-safe variant styling
- `lucide-react` - Icon library

**Data Management:**
- `@tanstack/react-query` - Server state management
- `drizzle-orm` - Type-safe ORM
- `drizzle-zod` - Schema validation
- `zod` - Runtime type validation

**Authentication:**
- `openid-client` - OpenID Connect client
- `passport` - Authentication middleware
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store

**Development:**
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `tsx` - TypeScript execution
- `wouter` - Client-side routing