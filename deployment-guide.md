# Softphone Application Deployment Guide for Railway

This guide will walk you through deploying both the backend (Node.js Express) and frontend (ASP.NET Core) components of the Softphone application to Railway.

## Prerequisites

1. A Railway account (https://railway.app)
2. Git installed on your local machine
3. A GitHub repository for your project
4. Twilio account with the following:
   - Account SID
   - Auth Token
   - API Key and Secret
   - TwiML App SID
   - Twilio Phone Number

## Step 1: Prepare Your Code for Deployment

We've already prepared the necessary configuration files:
- Backend: `railway.toml`, `nixpacks.toml`, and `.npmrc`
- Frontend: `railway.toml` and `Dockerfile`

## Step 2: Push Your Code to GitHub

```bash
# Initialize Git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Railway deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/softphone-app.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy the Backend to Railway

1. Log in to your Railway account
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Choose the backend directory (`backend/new-backend`)
5. Click "Deploy"

6. Once deployed, go to the "Variables" tab and add the following environment variables:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_API_KEY=your_api_key
   TWILIO_API_SECRET=your_api_secret
   TWILIO_TWIML_APP_SID=your_twiml_app_sid
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

7. Get the deployed URL from the "Settings" tab (it will look like `https://softphone-backend-production.up.railway.app`)

## Step 4: Update Backend Environment Variables

1. In the Railway dashboard, go to your backend project
2. Go to the "Variables" tab
3. Update the following variables:
   ```
   WEBHOOK_BASE_URL=https://backend-production-a3eb.up.railway.app
   ALLOWED_ORIGINS=http://localhost:5252,https://localhost:7245,https://backend-production-a3eb.up.railway.app
   ```

## Step 5: Deploy the Frontend to Railway

1. In Railway, click "New Project" > "Deploy from GitHub repo"
2. Select your repository again
3. Choose the frontend directory (`Softphone.Frontend`)
4. Click "Deploy"

5. Once deployed, get the frontend URL from the "Settings" tab

## Step 6: Update Frontend Backend URL

1. In your local code, update the backend URL in `Softphone.Frontend/wwwroot/js/calling.js`:
   ```javascript
   // For production, use the deployed backend URL
   backendUrl = 'https://backend-production-a3eb.up.railway.app';
   ```

2. Commit and push these changes:
   ```bash
   git add .
   git commit -m "Update backend URL"
   git push
   ```

3. Railway will automatically redeploy your frontend with the updated URL

## Step 7: Update Twilio Configuration

1. Log in to your Twilio account
2. Go to the TwiML App configuration
3. Update the Voice Request URL to point to your backend:
   - Voice Request URL: `https://backend-production-a3eb.up.railway.app/api/voice/outbound`
   - Status Callback URL: `https://backend-production-a3eb.up.railway.app/api/voice/status`

4. For your Twilio phone number:
   - Voice Request URL: `https://backend-production-a3eb.up.railway.app/api/voice`
   - Status Callback URL: `https://backend-production-a3eb.up.railway.app/api/voice/status`

## Step 8: Test Your Deployed Application

1. Open your frontend URL in a browser
2. Try making a call to verify everything is working correctly
3. Check the Railway logs for both frontend and backend to troubleshoot any issues

## Troubleshooting

### CORS Issues
If you encounter CORS issues, make sure:
1. The frontend URL is included in the `ALLOWED_ORIGINS` environment variable in the backend
2. The backend URL in the frontend JavaScript is correct

### Connection Issues
If the frontend can't connect to the backend:
1. Check that both applications are running (green status in Railway)
2. Verify the URLs in the code are correct
3. Check the Railway logs for any errors

### Twilio Issues
If calls aren't working:
1. Verify your Twilio credentials in the backend environment variables
2. Check that the webhook URLs in Twilio are pointing to your deployed backend
3. Look for any errors in the Railway logs

## Updating Your Deployment

Railway automatically redeploys your application when you push changes to your GitHub repository. To update your deployment:

1. Make changes to your code locally
2. Commit and push to GitHub
3. Railway will automatically detect the changes and redeploy

## Important Notes

1. Keep your Twilio credentials secure and never commit them to your repository
2. Use environment variables for all sensitive information
3. Always test your application after deployment to ensure everything is working correctly 