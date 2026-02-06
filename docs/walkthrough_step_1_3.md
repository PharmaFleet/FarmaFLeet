# Cloud, Firebase, and External Services Setup Walkthrough
*Covering Steps 1.3, 1.6, and 1.7 of PharmaFleet Development Plan*

This guide provides a comprehensive, step-by-step walkthrough for setting up the Google Cloud Platform infrastructure, Firebase services, and external APIs required for the PharmaFleet Delivery System.

## Prerequisites

- A Google Account.
- Access to the [Google Cloud Console](https://console.cloud.google.com/).
- Access to the [Firebase Console](https://console.firebase.google.com/).
- The `gcloud` CLI installed on your local machine (optional but recommended).

---

## Part 1: Google Cloud Platform (GCP) Setup (Step 1.3)

### 1. Create GCP Project and Enable Billing

#### 1.1 Create a New Project
1. Go to the [Manage Resources](https://console.cloud.google.com/cloud-resource-manager) page.
2. Click **Create Project**.
3. **Project Name**: `pharmafleet-prod` (or `pharmafleet-dev` for testing).
4. **Project ID**: This is unique globally. Note this down (e.g., `pharmafleet-prod-12345`).
5. **Organization**: Select your organization if applicable.
6. Click **Create**.

#### 1.2 Enable Billing
1. Open the navigation menu and go to **Billing**.
2. Link a billing account to your project to enable services.

### 2. Enable Required GCP APIs

1. Go to **APIs & Services > Library**.
2. Search for and enable the following APIs:

**Core Infrastructure:**
- **Compute Engine API**
- **Cloud SQL Admin API**
- **Cloud Storage API**
- **Cloud Run API**
- **Artifact Registry API**
- **Secret Manager API**

**Maps & Location:**
- **Maps JavaScript API** (Web Dashboard)
- **Maps SDK for Android** (Mobile App)
- **Directions API** (Routing)
- **Geocoding API** (Address conversion)
- **Distance Matrix API** (ETA/Distance)

**Firebase:**
- **Firebase Cloud Messaging API**

### 3. Set up Cloud SQL (PostgreSQL with PostGIS)

#### 3.1 Create Instance
1. Go to **SQL** -> **Create Instance** -> **PostgreSQL**.
2. **Instance ID**: `pharmafleet-db`.
3. **Password**: Generate and save a strong password for the `postgres` user.
4. **Region**: Select a region (e.g., `me-west1` or `europe-west1`).
5. **Zonal availability**: "Single zone" (Dev) or "High availability" (Prod).

#### 3.2 Configuration
1. **Machine**: `Shared core` (Dev) or `Standard` (Prod).
2. **Storage**: SSD, Enable automatic increase.
3. **Connections**:
   - Enable **Public IP** (for Cloud Run/Dev access).
   - Add your local IP to **Authorized networks** for direct DB access tools (DBeaver).
4. Click **Create Instance**.

#### 3.3 Database & User Setup
1. In the instance details, go to **Databases** -> **Create Database** -> Name: `pharmafleet`.
2. Go to **Users** -> **Add User Account** -> Name: `api_user`, Password: [STRONG_PASSWORD].

#### 3.4 Enable PostGIS
Connect to your database (via Cloud Shell or local tool) and run:
```sql
\c pharmafleet
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_Version();
```

### 4. Cloud Storage Setup

1. Go to **Cloud Storage > Buckets** -> **Create**.
2. **Name**: `pharmafleet-proof-of-delivery-[project-id]`.
3. **Location**: Same region as DB.
4. **Class**: Standard.
5. **Access Control**: Uniform.
6. **Public Access Prevention**: Enforced (checked).

#### 4.1 CORS Configuration
Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```
Run: `gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json`

### 5. Service Accounts & Secrets

1. **IAM > Service Accounts** -> Create `backend-service-account`.
2. **Roles**: Cloud SQL Client, Storage Object Admin, Secret Manager Secret Accessor.
3. **Secret Manager** -> Create Secrets:
   - `DB_PASSWORD`: Value of `api_user` password.
   - `MAPS_API_KEY`: (Value created in Part 3).

---

## Part 2: Firebase Setup (Step 1.6)

### 1. Initialize Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Select your existing GCP project (`pharmafleet-prod`) from the list.
4. Click **Continue**.
5. Enable Google Analytics if desired (optional for this scope).
6. Click **Add Firebase**.

### 2. Register Android App
1. In the Project Overview, click the **Android** icon (robot).
2. **Android package name**: Must match your Flutter config (e.g., `com.aldawaeya.pharmafleet`).
   - *Check* `mobile/android/app/build.gradle` `applicationId` to be sure.
3. **App nickname**: "PharmaFleet Driver App".
4. **Debug signing certificate SHA-1**:
   - Run in your local terminal: `cd mobile/android && ./gradlew signingReport`
   - Copy the `SHA1` from the `debug` variant.
   - *Note: You will need to add the Release SHA-1 later for production.*
5. Click **Register app**.

### 3. Configure Mobile App (`google-services.json`)
1. Download the `google-services.json` file.
2. Place this file in your project directory: `mobile/android/app/google-services.json`.
3. Click **Next** in the console.
4. The Flutter setup instructions in the console are for native Android; since we use Flutter, we use the `firebase_core` package, but the JSON file placement is critical.

### 4. Configure Firebase Cloud Messaging (FCM)
1. In Firebase Console, go to **Project settings** (gear icon) -> **Cloud Messaging** tab.
2. Note the **Sender ID**.
3. **Server Key**:
   - If "Cloud Messaging API (Legacy)" is disabled, enable it via the 3-dot menu or use the new **V1 HTTP API**.
   - *Recommendation*: Migrate to V1. Generate a private key for the Service Account to use with the backend SDK.
   - For legacy support (easier initial setup): Enable Legacy API and copy the **Server Key**.
4. Add this key to your Backend `.env` or Secret Manager as `FCM_SERVER_KEY`.

---

## Part 3: External Service Setup (Step 1.7)

### 1. API Key Creation
1. Go to GCP Console -> **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **API Key**.
3. A new key is created (e.g., `AIzaSy...`).

### 2. Secure Your Keys (Crucial)
Do not use a single unrestricted key. Create separate keys for specific platforms.

#### Key 1: Browser Key (For React Dashboard)
1. Edit the key you just created. Name it `Maps Key - Web`.
2. **Application restrictions**: **HTTP referrers (web sites)**.
3. **Website restrictions**:
   - Add your development URL: `http://localhost:5173/*`
   - Add your production URL: `https://dashboard.pharmafleet.com/*`
4. **API restrictions**: Select **Restrict key**.
   - Select **Maps JavaScript API**.
5. Save.

#### Key 2: Android Key (For Mobile App)
1. Create a new API Key. Name it `Maps Key - Android`.
2. **Application restrictions**: **Android apps**.
3. **Android restrictions**:
   - Click **Add an item**.
   - Enter Package name: `com.aldawaeya.pharmafleet`
   - Enter SHA-1 fingerprint: (Same one used in Firebase setup).
4. **API restrictions**: Select **Restrict key**.
   - Select **Maps SDK for Android**.
5. Save.
6. Add this key to `mobile/android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_ANDROID_KEY"/>
   ```

#### Key 3: Server Key (For Backend Services)
1. Create a new API Key. Name it `Maps Key - Backend`.
2. **Application restrictions**: **IP addresses** (web servers, cron jobs, etc.).
   - Add the public IP of your Cloud Run instance (via NAT) or leave unrestricted *temporarily* for dev, but monitor closely.
3. **API restrictions**: Select **Restrict key**.
   - Select **Directions API**, **Distance Matrix API**, **Geocoding API**.
4. Save.
5. Add this key to your Backend `.env` or Secret Manager as `GOOGLE_MAPS_API_KEY`.

### 3. Monitoring and Quotas
1. Go to **APIs & Services** -> **Quotas**.
2. Review the limits for the Maps APIs.
3. Set up **Billing Alerts** in the Billing section to notify you if costs exceed a threshold (e.g., $50/month).

---

## Verification Checklist

- [ ] Project created and billing enabled.
- [ ] Postgres DB running with PostGIS enabled.
- [ ] Storage bucket created with CORS.
- [ ] `google-services.json` placed in Android app folder.
- [ ] FCM Server Key stored in Backend secrets.
- [ ] Maps API Keys created (Web, Android, Server) and restricted.
- [ ] API Keys configured in respective `.env` and `AndroidManifest.xml` files.