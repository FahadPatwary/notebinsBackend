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

1. Go to MongoDB Atlas Dashboard
2. Navigate to "Database Access"
3. Edit the user `fahadpatwary`
4. Ensure "Built-in Role" is set to "Read and write to any database"
5. Reset password if needed (avoid special characters)
6. Update the MONGODB_URI environment variable

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