# Production Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] Change `JWT_SECRET` to strong random value
- [ ] Change `JWT_REFRESH_SECRET` to strong random value
- [ ] Use HTTPS for all connections
- [ ] Update CORS settings for production domain
- [ ] Review and update security headers
- [ ] Enable rate limiting
- [ ] Set up error monitoring (Sentry, etc.)

### Environment Variables
- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB Atlas connection string
- [ ] Set production API URLs
- [ ] Configure Google OAuth for production domain
- [ ] Set Gemini API key with production quota

### Database
- [ ] Set up MongoDB Atlas cluster
- [ ] Configure database backups
- [ ] Set up database monitoring
- [ ] Test database connection

## Frontend Deployment

### Build

```bash
cd client
npm run build
```

This creates a `dist` folder with optimized production build.

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard:
   - `VITE_API_URL`: Your backend API URL
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID

### Deploy to Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Deploy: `netlify deploy --prod --dir=dist`
3. Set environment variables in Netlify dashboard

### Environment Variables (Frontend)

```env
VITE_API_URL=https://your-api-domain.com/api
VITE_GOOGLE_CLIENT_ID=your-production-google-client-id
```

## Backend Deployment

### Deploy to Render

1. Create new Web Service
2. Connect your repository
3. Build command: `cd server && npm install && npm run build`
4. Start command: `cd server && npm start`
5. Set environment variables:
   - `PORT`: 5000 (or Render's assigned port)
   - `NODE_ENV`: production
   - `MONGO_URI`: MongoDB Atlas connection string
   - `JWT_SECRET`: Strong random secret
   - `JWT_REFRESH_SECRET`: Strong random secret
   - `GEMINI_API_KEY`: Your Gemini API key
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `CLIENT_URL`: Your frontend URL

### Deploy to Railway

1. Create new project
2. Add service from GitHub
3. Set root directory to `server`
4. Configure environment variables (same as Render)
5. Deploy

### Environment Variables (Backend)

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chat-app
JWT_SECRET=your-strong-random-secret
JWT_REFRESH_SECRET=your-strong-random-secret
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
CLIENT_URL=https://your-frontend-domain.com
```

## MongoDB Atlas Setup

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist deployment server IP (or 0.0.0.0/0 for all)
5. Get connection string
6. Update `MONGO_URI` in backend environment variables

## CORS Configuration

Update `server/src/server.js` to allow your production frontend:

```javascript
const corsOptions = {
  origin: process.env.CLIENT_URL || 'https://your-frontend-domain.com',
  credentials: true,
};
```

## Google OAuth Setup

1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized JavaScript origins:
   - `https://your-frontend-domain.com`
4. Add authorized redirect URIs:
   - `https://your-frontend-domain.com`
5. Update `GOOGLE_CLIENT_ID` in both frontend and backend

## Docker Deployment (Optional)

### Frontend

```bash
docker build -f Dockerfile.prod -t chat-app-client .
docker run -p 80:80 chat-app-client
```

### Backend

```bash
cd server
docker build -t chat-app-server .
docker run -p 5000:5000 --env-file .env chat-app-server
```

## Post-Deployment

### Verification

- [ ] Test user registration and login
- [ ] Test real-time messaging
- [ ] Test AI assistant
- [ ] Verify HTTPS is working
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Test on mobile devices

### Monitoring

- Set up error tracking (Sentry, LogRocket)
- Monitor API response times
- Track database performance
- Monitor Gemini API usage
- Set up uptime monitoring

### Maintenance

- Regular security updates
- Database backups
- Monitor API quotas
- Review error logs
- Performance optimization

## Troubleshooting

**CORS Errors:**
- Verify `CLIENT_URL` matches frontend domain
- Check CORS configuration in server

**Socket.io Connection Issues:**
- Verify WebSocket support on hosting platform
- Check firewall settings
- Verify `VITE_SOCKET_URL` is set correctly

**Database Connection:**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Verify database user credentials

**Environment Variables:**
- Ensure all required variables are set
- Check for typos in variable names
- Verify values are correct

## Production Best Practices

1. **Use Environment Variables:** Never hardcode secrets
2. **Enable HTTPS:** Required for production
3. **Monitor Logs:** Set up log aggregation
4. **Backup Database:** Regular automated backups
5. **Rate Limiting:** Prevent abuse
6. **Error Handling:** Graceful error handling
7. **Performance:** Monitor and optimize
8. **Security:** Regular security audits

