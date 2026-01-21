# ProjectLog

A collaborative status tracking platform where project progress is tracked like a social media feed. Users post narrative updates instead of changing status dropdowns.

**Core Philosophy:** "The Feed is the Truth"

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React Native (Expo) - Web first |
| Backend | Node.js + Fastify |
| Database | MongoDB Atlas |
| Auth | JWT + Bcrypt |
| State | Zustand + React Query |

## Project Structure

```
/Agenda
├── backend/                 # Fastify API server
│   ├── src/
│   │   ├── config/         # Database, JWT, CORS configuration
│   │   ├── plugins/        # Fastify plugins (MongoDB, Auth, Swagger)
│   │   ├── models/         # Zod schemas for validation
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, authorization, rate limiting
│   │   ├── utils/          # Helpers (password, slug, pagination)
│   │   └── types/          # TypeScript definitions
│   └── package.json
│
└── frontend/               # Expo React Native app
    ├── app/                # Expo Router pages
    │   ├── (auth)/        # Login, register screens
    │   ├── (main)/        # Main app with bottom tabs
    │   │   ├── (feed)/    # Combined feed
    │   │   ├── (teams)/   # Teams management
    │   │   ├── (projects)/ # Projects management
    │   │   └── (profile)/ # User profile & settings
    │   └── invite/        # Accept invite screen
    └── src/
        ├── components/    # Reusable UI components
        ├── hooks/         # Custom React hooks
        ├── store/         # Zustand stores
        ├── api/           # API client and endpoints
        ├── lib/           # Utilities (storage, auth)
        ├── constants/     # Colors, config, categories
        └── types/         # TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```env
   PORT=3000
   HOST=0.0.0.0
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/projectlog
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   CORS_ORIGIN=http://localhost:8081
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Add placeholder asset files to `assets/`:
   - `icon.png` (1024x1024)
   - `splash.png` (1284x2778)
   - `adaptive-icon.png` (1024x1024)
   - `favicon.png` (48x48)

4. Start the Expo development server:
   ```bash
   npm start
   ```

5. Press `w` to open in web browser, or scan the QR code with Expo Go app.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh tokens
- `GET /api/auth/me` - Get current user

### Teams
- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create team
- `GET /api/teams/:teamId` - Get team
- `PATCH /api/teams/:teamId` - Update team
- `DELETE /api/teams/:teamId` - Delete team
- `GET /api/teams/:teamId/members` - Get members
- `PATCH /api/teams/:teamId/members/:memberId` - Update role
- `DELETE /api/teams/:teamId/members/:memberId` - Remove member
- `POST /api/teams/:teamId/leave` - Leave team

### Projects
- `GET /api/teams/:teamId/projects` - Get team projects
- `POST /api/teams/:teamId/projects` - Create project
- `GET /api/projects/:projectId` - Get project
- `PATCH /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

### Updates (Feed)
- `POST /api/updates` - Create update
- `GET /api/feed` - Get combined feed
- `GET /api/feed/team/:teamId` - Get team feed
- `GET /api/feed/project/:projectId` - Get project feed
- `GET /api/updates/:updateId` - Get single update
- `PATCH /api/updates/:updateId` - Edit update
- `DELETE /api/updates/:updateId` - Delete update
- `POST /api/updates/:updateId/reactions` - Add reaction
- `DELETE /api/updates/:updateId/reactions/:emoji` - Remove reaction

### Invites
- `POST /api/teams/:teamId/invites` - Create invite
- `GET /api/teams/:teamId/invites` - Get team invites
- `DELETE /api/teams/:teamId/invites/:inviteId` - Revoke invite
- `POST /api/teams/:teamId/invites/:inviteId/resend` - Resend invite
- `GET /api/invites/:token` - Get invite by token
- `POST /api/invites/:token/accept` - Accept invite
- `GET /api/invites/pending` - Get pending invites for user

## Update Categories

| Category | Color | Use Case |
|----------|-------|----------|
| progress | green | General progress updates |
| blocker | red | Issues blocking work |
| bug | orange | Bug reports and fixes |
| feature | purple | New features |
| milestone | yellow | Major achievements |
| general | gray | Everything else |

## Security Features

- Password hashing with bcrypt (cost factor 12)
- JWT tokens: 15min access, 7day refresh
- Rate limiting per endpoint
- Input validation with Zod
- CORS restricted in production
- Helmet security headers

## Development

### Running Tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Building for Production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npx expo build:web
```

## License

MIT
