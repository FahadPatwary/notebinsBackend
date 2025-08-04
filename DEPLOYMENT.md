# NoteBins Backend Deployment Guide

## Environment Variables

For production deployment, ensure the following environment variables are set:

```
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://www.notebins.me,https://notebins.me,https://notebins.netlify.app,http://localhost:5173,http://localhost:3000
MONGODB_URI=mongodb+srv://fahadpatwary:CBdglAXg0FlYKVvd@savednote.iji1p.mongodb.net/notebins?retryWrites=true&w=majority&appName=SavedNote
NOTE_EXPIRATION_DAYS=3
```

## MongoDB Atlas Setup

### Troubleshooting Authentication Issues

If you encounter `MongoServerError: bad auth : authentication failed`, check:

1. **Database User Permissions**: Ensure the user has "Read and write to any database" role
2. **IP Whitelist**: Add `0.0.0.0/0` to Network Access in MongoDB Atlas
3. **Password**: Avoid special characters that need URL encoding
4. **Username/Password**: Use database user credentials, not Atlas account credentials

### Steps to Fix Authentication:

**IMMEDIATE ACTION REQUIRED:**

1. **Go to MongoDB Atlas Dashboard** (https://cloud.mongodb.com/)
2. **Navigate to "Database Access"** in the left sidebar
3. **Find user `fahadpatwary`** and click "Edit"
4. **Check Built-in Role**: Ensure it's set to "Read and write to any database" or "Atlas admin"
5. **Reset Password**:
   - Click "Edit Password"
   - Generate a new password (avoid special characters like @, :, /, ?, #, [, ], %)
   - Use only alphanumeric characters for simplicity
   - Copy the new password
6. **Update Environment Variables**:
   - In Render dashboard, go to your service settings
   - Update `MONGODB_URI` with the new password
   - Format: `mongodb+srv://fahadpatwary:NEW_PASSWORD@savednote.iji1p.mongodb.net/notebins?retryWrites=true&w=majority&appName=SavedNote`
7. **Verify Network Access**: Ensure `0.0.0.0/0` is in the IP Access List
8. **Redeploy**: Trigger a new deployment in Render

## Deployment on Render

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Ensure build command: `npm install`
4. Ensure start command: `npm start`

## CORS Configuration

The backend is configured to accept requests from:
- https://www.notebins.me
- https://notebins.me
- https://notebins.netlify.app
- http://localhost:5173 (development)
- http://localhost:3000 (development)

## Build Process

1. `npm install` - Install dependencies
2. `npm run build` - Compile TypeScript to JavaScript
3. `npm start` - Start the production server