# Real-Time Chat Application with AI Assistant

A full-stack real-time chat application built with React, Node.js, Express, Socket.io, MongoDB, and Gemini integration.

## Features

- Real-time messaging with Socket.io
- AI Assistant powered by Google Gemini
- User authentication (JWT + Google OAuth)
- Typing indicators, online presence, read receipts
- Group chats with AI summaries
- Responsive design

## Quick Start

See [docs/README.md](./docs/README.md) for setup instructions.

## Documentation

All documentation is organized in the `docs/` folder:

- **[README.md](./docs/README.md)** - Quick start and setup guide
- **[TESTING.md](./docs/TESTING.md)** - Testing guide (API, unit tests, notifications)
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment guide

## Project Structure

```
Chat Application/
├── client/          # React frontend
├── server/          # Node.js backend
├── docs/            # Documentation
└── README.md        # This file
```

## Tech Stack

- **Frontend:** React, TypeScript, Apollo Client, Socket.io Client
- **Backend:** Node.js, Express, TypeScript, Socket.io, MongoDB
- **AI:** Google Gemini API
- **Auth:** JWT, Google OAuth

## License

MIT
