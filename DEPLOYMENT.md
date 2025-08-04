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

## 🚨 CRITICAL: Fix MongoDB Authentication Error

The deployment is failing with "bad auth: authentication failed" because the environment variables in Render are not updated. The URI shows the old password `CBdglAXg0FlYKVvd` instead of the new password `fahad786786`.

### IMMEDIATE ACTION REQUIRED:

#### Step 1: Update Environment Variables in Render Dashboard
1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Select your backend service (notebinsBackend)**
3. **Click "Environment" in the left sidebar**
4. **Find the `MONGODB_URI` environment variable**
5. **Update it to:**
   ```
   mongodb+srv://fahadpatwary:fahad786786@savednote.iji1p.mongodb.net/notebins?retryWrites=true&w=majority&appName=SavedNote
   ```
6. **Select "Save, rebuild, and deploy" from the dropdown**
7. **Click Save Changes**

#### Step 2: Verify MongoDB Atlas Settings
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Database Access**: Ensure user `fahadpatwary` exists with password `fahad786786`
3. **Network Access**: Ensure `0.0.0.0/0` is in the IP Access List
4. **Database**: Ensure database `notebins` exists

#### Step 3: Monitor Deployment
1. Wait for Render to complete the deployment
2. Check the deployment logs for "MongoDB connected successfully"
3. Test the frontend connection

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