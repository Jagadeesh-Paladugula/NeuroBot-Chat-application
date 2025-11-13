# Chat Application - Quick Start Guide

A full-stack real-time chat application with AI assistant powered by Google Gemini.

## Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- Google OAuth Client ID
- Google Gemini API key

## Quick Setup

### 1. Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Environment Setup

**Root `.env` file:**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
GEMINI_API_KEY=your-gemini-key
GOOGLE_CLIENT_ID=your-google-client-id
CLIENT_URL=http://localhost:5173
```

**Client `.env` file:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Seed Database

```bash
npm run seed
```

Creates demo users:
- `demo1@example.com` / `demo123`
- `demo2@example.com` / `demo123`
- `assistant@demo.com` / `demo123`

### 4. Run Application

**Terminal 1 - Server:**
```bash
cd server && npm run dev
```

**Terminal 2 - Client:**
```bash
cd client && npm run dev
```

Access at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Testing

See [TESTING.md](./TESTING.md) for detailed testing instructions.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages
- `GET /api/conversations/:id/summary` - AI summary

## Socket.io Events

**Client → Server:**
- `addUser` - Register socket user
- `sendMessage` - Send message
- `typing` - Typing indicator
- `messageDelivered` - Mark delivered
- `messageSeen` - Mark seen

**Server → Client:**
- `connected` - Socket connected
- `getMessage` - New message
- `typing` - User typing
- `userOnline` / `userOffline` - Presence
- `messageStatusUpdate` - Status change

## Troubleshooting

**MongoDB Connection:**
- Verify `MONGO_URI` is correct
- Check MongoDB is running (if local)

**Socket.io Issues:**
- Check CORS settings
- Verify `CLIENT_URL` matches frontend URL

**Gemini Not Working:**
- Verify API key is correct
- Check API quota/rate limits

