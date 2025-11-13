# Testing Guide

## Quick Testing with Demo Accounts

1. Start the application (see [README.md](./README.md))
2. Open http://localhost:5173
3. Click "Demo User 1" or "Demo User 2" to login
4. Test messaging, AI assistant, and real-time features

## API Testing

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "test123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo1@example.com", "password": "demo123"}'
```

**Get Conversations (replace TOKEN):**
```bash
curl -X GET http://localhost:5000/api/conversations \
  -H "Authorization: Bearer TOKEN"
```

**Get Messages:**
```bash
curl -X GET http://localhost:5000/api/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

Import `POSTMAN_COLLECTION.json` from the root directory for pre-configured API requests.

## Backend Unit Tests

### Running Tests

```bash
cd server
npm test
```

### Test Structure

```
server/src/tests/
├── setup.js              # Test database setup
├── helpers/
│   └── testHelpers.js   # Test utilities
├── unit/                 # Unit tests
└── integration/          # Integration tests
```

### Test Configuration

Create `.env.test` file:
```env
TEST_MONGO_URI=mongodb://localhost:27017/chat-app-test
JWT_SECRET=test-secret-key
NODE_ENV=test
```

### Writing Tests

**Unit Test Example:**
```javascript
import * as authService from '../../../services/authService.js';

describe('Auth Service', () => {
  it('should register a new user', async () => {
    const result = await authService.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
  });
});
```

**Integration Test Example:**
```javascript
import request from 'supertest';
import app from '../../app.js';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });
});
```

## Browser Push Notifications Testing

### Prerequisites
- Modern browser (Chrome, Firefox, Edge, Safari)
- Notification permissions granted

### Testing Steps

1. **Open two browser windows:**
   - Window 1: Login as User A (e.g., Demo User 1)
   - Window 2: Login as User B (e.g., Demo User 2) in incognito/different browser

2. **Grant notification permission:**
   - Click "Allow" when prompted
   - If no prompt, check browser settings:
     - Chrome: Settings > Privacy > Site settings > Notifications
     - Firefox: Settings > Privacy > Permissions > Notifications

3. **Test Scenarios:**

   **Scenario 1: Message from different conversation**
   - Window 1: Stay on `/chats` page
   - Window 2: Send message to User A
   - Expected: Window 1 shows notification

   **Scenario 2: Message while viewing different conversation**
   - Window 1: Open Conversation A
   - Window 2: Send message from Conversation B
   - Expected: Window 1 shows notification

   **Scenario 3: Message while tab in background**
   - Window 1: Switch to different tab
   - Window 2: Send message
   - Expected: Window 1 shows notification

   **Scenario 4: No notification when viewing same conversation**
   - Window 1: Open Conversation A with User B
   - Window 2: Send message in same Conversation A
   - Expected: Window 1 does NOT show notification

### Manual Testing via Console

```javascript
// Check permission
console.log('Notification permission:', Notification.permission);

// Request permission
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});

// Test notification
if (Notification.permission === 'granted') {
  new Notification('Test Notification', {
    body: 'This is a test',
    icon: '/favicon.ico'
  });
}
```

### Troubleshooting

- **No permission prompt:** Clear site data, reload page
- **Permission denied:** Reset in browser settings
- **Notifications not showing:** Check browser "Do Not Disturb" mode
- **Chrome:** Requires HTTPS in production (localhost works for dev)
- **Safari:** Has stricter notification policies

## AI Assistant Testing

1. Login with demo account
2. Open conversation with AI Assistant
3. Send message with `@ai` prefix or message directly
4. In group chat, click "AI Summary" button
5. Verify Gemini responds correctly

## Real-Time Features Testing

- **Typing Indicators:** Type in message input, verify indicator appears
- **Online Presence:** Login/logout, verify status updates
- **Read Receipts:** Send message, verify delivery/seen status
- **Socket Connection:** Check browser console for connection status

## Test Checklist

- [ ] User registration and login
- [ ] Message sending and receiving
- [ ] Real-time updates (typing, presence, receipts)
- [ ] AI assistant responses
- [ ] Browser notifications
- [ ] Socket.io connection
- [ ] API endpoints
- [ ] Error handling

