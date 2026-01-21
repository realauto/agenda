# ProjectLog Implementation Plan

## Overview
**ProjectLog** is a collaborative status tracking platform where project progress is tracked like a social media feed. Users post narrative updates instead of changing status dropdowns.

**Core Philosophy:** "The Feed is the Truth"
**Target Platform:** Web first (via Expo), adaptable to Mobile (iOS/Android) later

---

## Technology Stack

| Component | Technology | Reasoning |
|-----------|------------|-----------|
| Frontend | React Native (Expo) | Cross-platform, fast development, Expo Web for browser |
| Backend | Node.js + Fastify | High performance, low overhead, plugin system |
| Database | MongoDB Atlas | Flexible schema for logs and JSON-heavy data |
| Auth | JWT + Bcrypt | Stateless, secure authentication |
| State | Zustand + React Query | Simple global state + server state management |

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,        // unique, 3-30 chars
  email: String,           // unique, lowercase
  password: String,        // bcrypt hashed
  avatar: String,          // URL
  displayName: String,     // optional
  bio: String,             // max 200 chars
  settings: {
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    theme: String          // "light" | "dark" | "system"
  },
  lastActiveAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes: email (unique), username (unique), createdAt
```

### Teams Collection
```javascript
{
  _id: ObjectId,
  name: String,            // 3-50 chars
  slug: String,            // unique, URL-friendly
  description: String,     // max 500 chars
  avatar: String,          // team logo URL
  ownerId: ObjectId,       // ref: Users
  members: [{
    userId: ObjectId,      // ref: Users
    role: String,          // "admin" | "member" | "viewer"
    joinedAt: Date
  }],
  settings: {
    isPublic: Boolean,
    allowMemberInvites: Boolean,
    defaultProjectVisibility: String  // "team" | "public"
  },
  createdAt: Date,
  updatedAt: Date
}

// Indexes: slug (unique), ownerId, members.userId, createdAt
```

### Projects Collection
```javascript
{
  _id: ObjectId,
  name: String,            // 3-100 chars
  slug: String,            // unique within team
  description: String,     // max 1000 chars
  teamId: ObjectId,        // ref: Teams
  createdBy: ObjectId,     // ref: Users
  status: String,          // "active" | "paused" | "completed" | "archived"
  visibility: String,      // "team" | "public"
  color: String,           // hex color for UI
  tags: [String],
  pinnedUpdateId: ObjectId,  // ref: Updates
  stats: {
    totalUpdates: Number,
    lastUpdateAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}

// Indexes: (teamId, slug) unique, teamId + status, createdBy, stats.lastUpdateAt
```

### Updates Collection (Feed Entries)
```javascript
{
  _id: ObjectId,
  projectId: ObjectId,     // ref: Projects
  teamId: ObjectId,        // ref: Teams (denormalized for queries)
  authorId: ObjectId,      // ref: Users
  content: String,         // max 5000 chars
  contentHtml: String,     // processed HTML (mentions, links)
  category: String,        // "progress" | "blocker" | "bug" | "feature" | "milestone" | "general"
  mood: String,            // "positive" | "neutral" | "negative" | "urgent"
  mentions: [ObjectId],    // ref: Users
  attachments: [{
    type: String,          // "image" | "link" | "file"
    url: String,
    name: String,
    thumbnail: String
  }],
  reactions: [{
    userId: ObjectId,
    emoji: String,
    createdAt: Date
  }],
  isPinned: Boolean,
  isEdited: Boolean,
  editedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes: (teamId, createdAt), (projectId, createdAt), (authorId, createdAt), mentions
```

### Invites Collection
```javascript
{
  _id: ObjectId,
  teamId: ObjectId,        // ref: Teams
  invitedBy: ObjectId,     // ref: Users
  email: String,
  role: String,            // "admin" | "member" | "viewer"
  token: String,           // unique invite token
  status: String,          // "pending" | "accepted" | "expired" | "revoked"
  expiresAt: Date,         // 7 days default
  acceptedAt: Date,
  acceptedBy: ObjectId,    // ref: Users
  createdAt: Date
}

// Indexes: token (unique), (teamId, status), (email, teamId, status), expiresAt (TTL)
```

### RefreshTokens Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // ref: Users
  token: String,           // hashed refresh token
  deviceInfo: String,
  expiresAt: Date,
  createdAt: Date
}

// Indexes: token (unique), userId, expiresAt (TTL auto-delete)
```

---

## Backend Structure

```
/backend
├── src/
│   ├── config/
│   │   ├── index.ts           # Central config export
│   │   ├── database.ts        # MongoDB connection config
│   │   ├── jwt.ts             # JWT configuration
│   │   └── cors.ts            # CORS settings
│   │
│   ├── plugins/
│   │   ├── mongodb.ts         # MongoDB connection plugin
│   │   ├── auth.ts            # Auth decorator plugin
│   │   ├── swagger.ts         # API documentation
│   │   └── errorHandler.ts    # Global error handling
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Team.ts
│   │   ├── Project.ts
│   │   ├── Update.ts
│   │   ├── Invite.ts
│   │   └── RefreshToken.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── team.service.ts
│   │   ├── project.service.ts
│   │   ├── update.service.ts
│   │   ├── invite.service.ts
│   │   └── feed.service.ts
│   │
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── teams.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── updates.routes.ts
│   │   └── invites.routes.ts
│   │
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT verification
│   │   ├── authorize.ts       # Role-based access
│   │   ├── rateLimiter.ts
│   │   └── validateRequest.ts
│   │
│   ├── utils/
│   │   ├── password.ts        # Bcrypt helpers
│   │   ├── jwt.ts             # JWT helpers
│   │   ├── slug.ts            # Slug generation
│   │   ├── mentions.ts        # @mention parsing
│   │   └── pagination.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── app.ts                 # Fastify app setup
│   └── server.ts              # Entry point
│
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new account | No |
| POST | `/login` | Login, get tokens | No |
| POST | `/logout` | Invalidate refresh token | Yes |
| POST | `/refresh` | Get new access token | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset with token | No |
| GET | `/me` | Get current user | Yes |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/:id` | Get user profile | Yes |
| PATCH | `/me` | Update own profile | Yes |
| PATCH | `/me/password` | Change password | Yes |
| PATCH | `/me/settings` | Update settings | Yes |
| GET | `/me/teams` | List user's teams | Yes |

### Teams (`/api/teams`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/` | Create team | - |
| GET | `/` | List user's teams | - |
| GET | `/:teamId` | Get team details | any |
| PATCH | `/:teamId` | Update team | admin |
| DELETE | `/:teamId` | Delete team | owner |
| GET | `/:teamId/members` | List members | any |
| PATCH | `/:teamId/members/:userId` | Update member role | admin |
| DELETE | `/:teamId/members/:userId` | Remove member | admin |
| POST | `/:teamId/leave` | Leave team | member |

### Projects (`/api/teams/:teamId/projects`)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/` | Create project | admin/member |
| GET | `/` | List team projects | any |
| GET | `/:projectId` | Get project details | any |
| PATCH | `/:projectId` | Update project | admin/member |
| DELETE | `/:projectId` | Delete project | admin |

### Updates (`/api/updates`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create update |
| GET | `/feed` | Get combined feed (all teams) |
| GET | `/feed/team/:teamId` | Get team feed |
| GET | `/feed/project/:projectId` | Get project feed |
| GET | `/:updateId` | Get single update |
| PATCH | `/:updateId` | Edit update (author only) |
| DELETE | `/:updateId` | Delete update (author/admin) |
| POST | `/:updateId/reactions` | Add reaction |
| DELETE | `/:updateId/reactions/:emoji` | Remove reaction |

### Invites (`/api/invites`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create invite (admin) |
| GET | `/team/:teamId` | List team invites (admin) |
| GET | `/:token` | Get invite details (public) |
| POST | `/:token/accept` | Accept invite |
| DELETE | `/:inviteId` | Revoke invite (admin) |

---

## Frontend Structure

```
/frontend
├── app/                           # Expo Router
│   ├── (auth)/                   # Auth group (no tabs)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   │
│   ├── (main)/                   # Main app with tabs
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── (feed)/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx         # Combined feed
│   │   ├── (teams)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Teams list
│   │   │   └── [teamId]/
│   │   │       ├── _layout.tsx
│   │   │       ├── index.tsx     # Team feed
│   │   │       ├── projects.tsx
│   │   │       ├── members.tsx
│   │   │       └── settings.tsx
│   │   ├── (projects)/
│   │   │   └── [projectId]/
│   │   │       ├── index.tsx     # Project feed
│   │   │       └── settings.tsx
│   │   └── (profile)/
│   │       ├── index.tsx         # User profile
│   │       └── settings.tsx
│   │
│   ├── invite/
│   │   └── [token].tsx           # Accept invite
│   │
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry redirect
│
├── src/
│   ├── components/
│   │   ├── ui/                   # Button, Input, Avatar, Card, Modal, etc.
│   │   ├── feed/
│   │   │   ├── UpdateCard.tsx
│   │   │   ├── UpdateComposer.tsx
│   │   │   ├── CategoryFilter.tsx
│   │   │   ├── ReactionPicker.tsx
│   │   │   └── FeedList.tsx
│   │   ├── team/
│   │   │   ├── TeamCard.tsx
│   │   │   ├── MemberList.tsx
│   │   │   ├── InviteModal.tsx
│   │   │   └── RoleSelector.tsx
│   │   ├── project/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFeed.ts
│   │   ├── useTeam.ts
│   │   └── useProject.ts
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── feedStore.ts
│   │   ├── teamStore.ts
│   │   └── uiStore.ts
│   │
│   ├── api/
│   │   ├── client.ts             # Axios with interceptors
│   │   ├── auth.api.ts
│   │   ├── teams.api.ts
│   │   ├── projects.api.ts
│   │   ├── updates.api.ts
│   │   └── invites.api.ts
│   │
│   ├── lib/
│   │   ├── storage.ts            # Token storage
│   │   └── auth.ts               # Token management
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── categories.ts
│   │   └── config.ts
│   │
│   └── types/
│       ├── user.ts
│       ├── team.ts
│       ├── project.ts
│       └── update.ts
│
├── app.json
├── package.json
└── tsconfig.json
```

---

## Navigation Flow

```
App Launch
    │
    ▼
Check Token ──── No Token ───► Login Screen
    │                              │
    │ Valid                        ├─► Register
    │                              └─► Forgot Password
    ▼
Main App (Bottom Tabs)
    │
    ├── Feed Tab
    │   └── Combined Feed (all teams)
    │       └── Category Filter
    │
    ├── Teams Tab
    │   └── Teams List
    │       └── Team Detail
    │           ├── Team Feed
    │           ├── Projects List
    │           │   └── Project Detail
    │           │       └── Project Feed
    │           ├── Members
    │           │   └── Invite Modal
    │           └── Team Settings
    │
    ├── New Update (FAB/Tab)
    │   └── Update Composer
    │
    └── Profile Tab
        └── Profile View
            └── Settings
            └── Logout
```

---

## Implementation Phases

### Phase 1: Foundation

**Backend:**
- [ ] Initialize Fastify project with TypeScript
- [ ] Set up MongoDB connection plugin
- [ ] Implement User model and schema
- [ ] Build auth endpoints (register, login, logout, refresh, me)
- [ ] Create JWT utilities and auth middleware
- [ ] Add Swagger documentation

**Frontend:**
- [ ] Initialize Expo project with TypeScript
- [ ] Set up Expo Router file structure
- [ ] Configure Axios client with interceptors
- [ ] Implement auth store (Zustand)
- [ ] Build auth screens (login, register)
- [ ] Create secure token storage
- [ ] Add auth navigation guard

**Deliverable:** Users can register, login, and see a placeholder home screen

---

### Phase 2: Teams & Projects

**Backend:**
- [ ] Implement Team model and schema
- [ ] Build team CRUD endpoints
- [ ] Add member management endpoints
- [ ] Create authorize middleware (role checks)
- [ ] Implement Project model and schema
- [ ] Build project CRUD endpoints

**Frontend:**
- [ ] Build Teams list screen
- [ ] Create Team detail screen with tabs
- [ ] Implement team creation flow
- [ ] Build Members screen with role management
- [ ] Create Projects list screen
- [ ] Build Project detail screen
- [ ] Add team/project stores

**Deliverable:** Users can create teams, manage members/roles, and create projects

---

### Phase 3: The Feed (Core)

**Backend:**
- [ ] Implement Update model and schema
- [ ] Build create update endpoint
- [ ] Build feed endpoints (combined, team, project)
- [ ] Add cursor-based pagination
- [ ] Implement @mention parsing
- [ ] Add category filtering

**Frontend:**
- [ ] Build UpdateComposer component
- [ ] Create UpdateCard component
- [ ] Implement FeedList with virtualization
- [ ] Add category filter chips
- [ ] Build combined feed screen
- [ ] Build team feed screen
- [ ] Build project feed screen
- [ ] Add pull-to-refresh and infinite scroll

**Deliverable:** Users can post updates and view chronological feeds

---

### Phase 4: Invite System

**Backend:**
- [ ] Implement Invite model and schema
- [ ] Build invite CRUD endpoints
- [ ] Implement token validation and acceptance
- [ ] Handle edge cases (expired, already member)

**Frontend:**
- [ ] Build InviteModal component
- [ ] Create pending invites list
- [ ] Build accept invite screen (deep link)
- [ ] Add invite management in team settings

**Deliverable:** Admins can invite users, users can accept invites

---

### Phase 5: Polish & Enhancement

**Backend:**
- [ ] Add reaction endpoints
- [ ] Implement update editing
- [ ] Add delete update endpoint
- [ ] Implement pinned updates
- [ ] Performance optimization (indexes, queries)

**Frontend:**
- [ ] Build ReactionPicker component
- [ ] Add reaction display on UpdateCard
- [ ] Implement update editing flow
- [ ] Add delete confirmation
- [ ] Build user profile screen
- [ ] Implement settings screen
- [ ] Add loading skeletons
- [ ] Implement empty states
- [ ] Add error handling and toasts

**Deliverable:** Full MVP with reactions, editing, and polished UX

---

### Phase 6: Testing & Deployment

- [ ] API integration tests
- [ ] Frontend component tests
- [ ] Set up CI/CD pipeline
- [ ] Configure MongoDB Atlas production
- [ ] Deploy backend (Railway/Render/Fly.io)
- [ ] Deploy web version (Expo EAS)
- [ ] Documentation updates

**Deliverable:** Deployed, tested MVP

---

## Update Categories

| Category | Color | Icon | Description |
|----------|-------|------|-------------|
| progress | #22c55e (green) | trending-up | General progress updates |
| blocker | #ef4444 (red) | alert-circle | Issues blocking progress |
| bug | #f97316 (orange) | bug | Bug reports and fixes |
| feature | #8b5cf6 (purple) | sparkles | New features |
| milestone | #eab308 (yellow) | flag | Major achievements |
| general | #6b7280 (gray) | message-circle | Everything else |

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "cursor": "abc123",
      "hasMore": true,
      "total": 150
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

---

## MVP Scope Decisions

- **Real-time:** Manual refresh only (pull-to-refresh + periodic polling). WebSocket can be added post-MVP.
- **Notifications:** Not in MVP scope
- **File uploads:** Basic attachment URLs only (no upload service in MVP)
- **Email sending:** Can be stubbed initially, integrate SendGrid/Resend later

---

## Security Checklist

- [ ] Bcrypt with cost factor 12
- [ ] JWT: 15min access tokens, 7-day refresh tokens
- [ ] Rate limiting per endpoint
- [ ] Input validation (JSON Schema via Fastify)
- [ ] CORS restricted to known origins in production
- [ ] Helmet for security headers
- [ ] Parameterized MongoDB queries (Mongoose)
- [ ] Sanitize user content before storage

---

## Critical Files

These are the most important files to implement:

1. **`/backend/src/models/Update.ts`** - Core feed data model
2. **`/backend/src/services/feed.service.ts`** - Feed aggregation logic
3. **`/backend/src/middleware/authorize.ts`** - Role-based access control
4. **`/frontend/src/components/feed/UpdateCard.tsx`** - Primary feed UI
5. **`/frontend/src/store/authStore.ts`** - Auth state management

---

## Next Steps

1. Set up the backend project structure
2. Set up the frontend project structure
3. Implement Phase 1 (Foundation)
