# Sanctuary Admin Panel - Deployment & Setup Guide

This guide ensures your Admin Panel is correctly hosted on Render and synchronized with your mobile app.

---

## 1. Cloud Database (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Free Cluster (Region: AWS Frankfurt for Render compatibility).
3. Under **Network Access**, add `0.0.0.0/0` (whitelist all IPs for Render).
4. Under **Database Access**, create a user (e.g., `oussama`) and a password.
5. Copy your **Connection String** (`mongodb+srv://...`).

---

## 2. Backend Deployment (Render)
1. Sign in to [Render](https://render.com/).
2. Select **New** > **Web Service**.
3. Connect your GitHub repository containing the `backend` folder.
4. Settings:
   - **Name**: `sanctuary-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `node backend/server.js`
5. **Environment Variables**:
   - `MONGO_URI`: (Your MongoDB Connection String)
   - `JWT_SECRET`: `monaliza12_secret` (or more secure)
   - `PORT`: `5000` (Render adds this automatically)
6. Click **Create Web Service** and wait for the "Live" status. Copy the URL (`https://...onrender.com`).

---

## 3. Frontend Deployment (Render Static)
1. In Render, select **New** > **Static Site**.
2. Connect your GitHub repository containing the `frontend` folder.
3. Settings:
   - **Name**: `sanctuary-admin`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. **Environment Variables**:
   - `VITE_API_URL`: (Paste your Backend URL + `/api`)
     - *Example: `https://sanctuary-backend.onrender.com/api`*
5. Click **Create Static Site**.

---

## 4. Super Admin Credentials
The following credentials are encrypted in the system once you run the seed script:
- **Email**: `oussama.sebrou@gmail.com`
- **Password**: `monaliza12`

---

## 5. APK Integration (The Bridge)
1. Copy `APK/SyncBridge.ts` to your mobile app source (`src/services/SyncBridge.ts`).
2. Update the `API_BASE_URL` in `SyncBridge.ts` with your live Render Backend URL.
3. In `storageService.ts` of the APK:
   - Call `syncBridge.syncFull()` inside `saveBooks` and `saveShelves`.
   - Call `syncBridge.pushReadingUpdate(bookId, bookTitle, seconds)` inside the `updateBookStats` function.

---

## 6. Manual Data Export
- Login to the Admin Panel.
- Use the **"Export CSV"** button on the dashboard to download all user activity in one file.
- Format: `[Device_ID, Last_Sync, Total_Minutes, Current_Streak]`.
