# Deployment Guide

This guide explains how to deploy the Karting Analysis Platform. The frontend will be hosted on Vercel, and the backend on Render.

## Prerequisites

- GitHub account
- Vercel account
- Render account
- Google Cloud Platform (GCP) Service Account key (JSON)
- Mistral AI API Key

## 1. Backend Deployment (Render)

The backend is a FastAPI application using Python.

### Steps:

1.  **Push your code to GitHub.** Ensure the `backend` directory is in your repository.
2.  **Log in to Render** and click **New +** -> **Web Service**.
3.  **Connect your GitHub repository.**
4.  **Configure the Service:**
    -   **Name:** `karting-backend` (or similar)
    -   **Root Directory:** `backend`
    -   **Environment:** `Python 3`
    -   **Build Command:** `pip install -r requirements.txt`
    -   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
5.  **Environment Variables:**
    Add the following environment variables in the "Environment" tab:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `PYTHON_VERSION` | `3.11.9` | (Optional) Specifies Python version |
    | `FRONTEND_URL` | `https://your-vercel-app-name.vercel.app` | The URL of your deployed frontend (add this *after* deploying frontend, or guess it) |
    | `MISTRAL_API_KEY` | `your_mistral_api_key` | API Key for Mistral AI |
    | `FIREBASE_BUCKET` | `karting-65c6c.firebasestorage.app` | Firebase Storage Bucket Name |
    | `GOOGLE_CREDENTIALS_JSON` | `{...}` | The **content** of your `service-account-key.json` file. Paste the entire JSON string here. |

    > **Note:** For `GOOGLE_CREDENTIALS_JSON`, open your local `service-account-key.json`, copy all the text, and paste it as the value. This allows the backend to authenticate with Google Cloud Storage without needing a physical file.

6.  **Deploy.** Render will build and start the service. Once live, copy the **Service URL** (e.g., `https://karting-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)

The frontend is a React + Vite application.

### Steps:

1.  **Log in to Vercel** and click **Add New...** -> **Project**.
2.  **Import your GitHub repository.**
3.  **Configure the Project:**
    -   **Framework Preset:** `Vite`
    -   **Root Directory:** `frontend` (Click "Edit" next to Root Directory and select `frontend`)
4.  **Environment Variables:**
    Add the following environment variables:

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `VITE_API_URL` | `https://karting-backend.onrender.com` | The URL of your deployed backend (from Step 1) |
    | `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase API Key |
    | `VITE_FIREBASE_AUTH_DOMAIN` | `karting-65c6c.firebaseapp.com` | Firebase Auth Domain |
    | `VITE_FIREBASE_PROJECT_ID` | `karting-65c6c` | Firebase Project ID |
    | `VITE_FIREBASE_STORAGE_BUCKET` | `karting-65c6c.firebasestorage.app` | Firebase Storage Bucket |
    | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1027908785385` | Firebase Messaging Sender ID |
    | `VITE_FIREBASE_APP_ID` | `1:1027908785385:web:91d59f648c4374157d4c78` | Firebase App ID |
    | `VITE_FIREBASE_MEASUREMENT_ID` | `G-197WPKRJSW` | Firebase Measurement ID |

    > **Note:** You can copy these values from your local `frontend/.env` file.

5.  **Deploy.** Vercel will build and deploy your frontend.

## 3. Final Configuration

1.  **Update Backend CORS:**
    Once the frontend is deployed, go back to Render -> Environment.
    Update `FRONTEND_URL` to match your actual Vercel URL (e.g., `https://karting-platform.vercel.app`).
    Render will automatically restart the service.

2.  **Verify:**
    Open your Vercel URL.
    -   Log in.
    -   Upload a session (tests Backend + GCS).
    -   Run an analysis (tests Backend + AI).

## Troubleshooting

-   **Backend Errors:** Check the "Logs" tab in Render.
-   **GCS/Firebase Errors:** Ensure `GOOGLE_CREDENTIALS_JSON` is correct and has no extra spaces. Ensure the Service Account has "Storage Admin" or "Storage Object Admin" role on the bucket.
-   **CORS Errors:** Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly (no trailing slash usually, or handled by the app).
