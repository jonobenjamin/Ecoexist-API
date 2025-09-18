# 🔥 AWT Live Dashboards Setup Guide

This guide transforms your AWT data sync into a **real-time live dashboard system** using Firebase for instant updates and interactive visualizations.

## 🎯 What You'll Build

- ✅ **Real-time AWT data sync** (every 15 minutes)
- ✅ **Live dashboard** that updates automatically
- ✅ **Interactive maps** showing animal movements
- ✅ **Real-time charts** and statistics
- ✅ **Push notifications** for new data

## 📋 Prerequisites

- ✅ **Existing AWT API credentials** (username, password, API key)
- ✅ **Google account** for Firebase
- ✅ **Node.js** installed (for Firebase functions)
- ✅ **Python** with required packages

---

# 🚀 SETUP GUIDE

## Step 1: Create Firebase Project

1. **Go to:** https://console.firebase.google.com/
2. **Click:** "Create a project" or "Add project"
3. **Name:** `awt-live-dashboards`
4. **Continue** through setup wizard
5. **Enable Google Analytics:** Optional (skip if you want)

## Step 2: Enable Firebase Services

### Enable Realtime Database
1. **In Firebase Console:** Go to "Realtime Database"
2. **Click:** "Create database"
3. **Security rules:** Start in "test mode" (we'll secure later)
4. **Location:** Choose closest to your users

### Enable Functions
1. **Go to:** "Functions" in Firebase Console
2. **It will prompt you to upgrade** - do this
3. **This enables** serverless functions

### Enable Hosting (Optional)
1. **Go to:** "Hosting" in Firebase Console
2. **This allows** web hosting for your dashboard

## Step 3: Get Firebase Credentials

### Download Service Account Key
1. **Go to:** Project Settings (gear icon) → "Service accounts"
2. **Click:** "Generate new private key"
3. **Download:** `awt-live-dashboards-firebase-adminsdk-xxxxx.json`
4. **Save securely:** This is your Firebase admin credentials

### Get Database URL
1. **Go to:** Realtime Database
2. **Copy the URL** from the top: `https://awt-live-dashboards-xxxxx-default-rtdb.firebaseio.com/`

## Step 4: Set Up Environment Variables

### For Local Development
Create a `.env` file in your project root:

```bash
# AWT API Credentials (same as before)
AWT_USERNAME=your_awt_username
AWT_PASSWORD=your_awt_password
AWT_API_KEY=your_awt_api_key

# Firebase Configuration (NEW)
FIREBASE_CREDENTIALS_PATH=/path/to/awt-live-dashboards-firebase-adminsdk-xxxxx.json
FIREBASE_DATABASE_URL=https://awt-live-dashboards-xxxxx-default-rtdb.firebaseio.com/

# GCS Fallback (optional)
GCS_PROJECT_ID=awt-api-472312
GCS_BUCKET_NAME=awt-tracking-data
GOOGLE_APPLICATION_CREDENTIALS=/path/to/awt-api-472312-xxxxx.json
```

### For GitHub Actions
**Add these secrets** in your GitHub repository:

- `AWT_USERNAME` - Your AWT username
- `AWT_PASSWORD` - Your AWT password
- `AWT_API_KEY` - Your AWT API key
- `FIREBASE_CREDENTIALS_BASE64` - Base64 encoded Firebase service account JSON
- `FIREBASE_DATABASE_URL` - Your Firebase database URL

## Step 5: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 6: Test Local Sync

```bash
python awt_data_sync.py
```

**Expected output:**
```
✓ Firebase initialized for live dashboards
2025-09-16 14:50:00 - INFO - Starting AWT data sync...
2025-09-16 14:50:00 - INFO - Performing initial 90-day data sync...
✓ Updated Firebase with X total records
```

## Step 7: Create Firebase Functions (Optional)

If you want scheduled syncs via Firebase (alternative to GitHub Actions):

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Initialize Firebase in your project
```bash
firebase init functions
```

### Create AWT Sync Function
Create `functions/src/awtSync.ts`:

```typescript
import * as functions from "firebase-functions";
import { exec } from "child_process";

export const syncAWTData = functions.pubsub
    .schedule("every 15 minutes")
    .onRun(async (context) => {
        // Run your Python sync script
        exec("python awt_data_sync.py", (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    });
```

### Deploy Functions
```bash
firebase deploy --only functions
```

## Step 8: Create Live Dashboard

### Simple HTML Dashboard
Create `dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AWT Live Dashboard</title>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js"></script>
</head>
<body>
    <h1>🦁 AWT Wildlife Tracking - Live Dashboard</h1>

    <div class="stats">
        <div id="animal-count">Loading...</div>
        <div id="last-update">Last update: Never</div>
    </div>

    <div id="animal-list">
        <h2>Recent Animals</h2>
        <div id="animals"></div>
    </div>

    <script>
        // Firebase configuration
        const firebaseConfig = {
            apiKey: "your-firebase-api-key",
            databaseURL: "https://awt-live-dashboards-xxxxx-default-rtdb.firebaseio.com"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        // Listen for real-time updates
        const awtRef = database.ref('awt-tracking-data');

        awtRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                updateDashboard(data);
            }
        });

        function updateDashboard(animals) {
            // Update stats
            document.getElementById('animal-count').textContent =
                `Total Animals Tracked: ${animals.length}`;

            document.getElementById('last-update').textContent =
                `Last Update: ${new Date().toLocaleString()}`;

            // Show recent animals (last 10)
            const recentAnimals = animals.slice(-10).reverse();
            const animalsDiv = document.getElementById('animals');

            animalsDiv.innerHTML = recentAnimals.map(animal =>
                `<div class="animal-card">
                    <h3>${animal.name || 'Unknown Animal'}</h3>
                    <p>Lat: ${animal.latitude}, Lng: ${animal.longitude}</p>
                    <p>Last Seen: ${new Date(animal.timestamp).toLocaleString()}</p>
                </div>`
            ).join('');
        }
    </script>

    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .stats { background: #f0f0f0; padding: 20px; margin: 20px 0; }
        .animal-card { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
    </style>
</body>
</html>
```

### Advanced Dashboard with Maps
For maps, add Leaflet.js:

```html
<!-- Add to head -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Add map div -->
<div id="map" style="height: 400px;"></div>

<script>
// Initialize map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Add animal markers
function updateMap(animals) {
    // Clear existing markers
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Add new markers
    animals.forEach(animal => {
        if (animal.latitude && animal.longitude) {
            L.marker([animal.latitude, animal.longitude])
                .addTo(map)
                .bindPopup(`${animal.name || 'Animal'}<br>Last seen: ${new Date(animal.timestamp).toLocaleString()}`);
        }
    });
}
</script>
```

## Step 9: Deploy Dashboard (Optional)

```bash
# Initialize hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## 🔧 Troubleshooting

### Firebase Connection Issues
```bash
# Check Firebase credentials
python -c "
import firebase_admin
from firebase_admin import credentials
cred = credentials.Certificate('path/to/firebase-key.json')
firebase_admin.initialize_app(cred)
print('✓ Firebase credentials valid')
"
```

### Data Not Appearing
1. **Check Firebase Console** → Realtime Database
2. **Verify path:** `/awt-tracking-data`
3. **Check logs** for sync script errors

### Dashboard Not Updating
1. **Check browser console** for Firebase errors
2. **Verify API key** in Firebase config
3. **Check database rules** (should allow read for now)

## 📊 Data Structure

Your Firebase will contain:

```
/awt-tracking-data: [
  {
    "animal_id": "123",
    "name": "Lion-Alpha",
    "latitude": -1.234,
    "longitude": 36.789,
    "timestamp": 1694567890123,
    "species": "Panthera leo"
  },
  // ... more animals
]
```

## 🎯 Next Steps

1. **Test the sync:** `python awt_data_sync.py`
2. **Open dashboard:** `dashboard.html` in browser
3. **Watch live updates:** Data appears instantly when sync runs
4. **Customize dashboard:** Add charts, filters, maps
5. **Secure database:** Update Firebase security rules for production

## 🚀 Advanced Features

- **Push Notifications:** Alert when animals enter danger zones
- **Historical Analysis:** Time-series charts of movement patterns
- **Multi-user Collaboration:** Team members see live updates
- **Mobile App:** React Native app with same Firebase backend
- **Machine Learning:** Predict animal movement patterns

---

**🎉 Congratulations!** You now have a live dashboard system that updates automatically whenever new AWT data arrives!

**Need help with any step?** Check the troubleshooting section or ask for specific guidance! 🔥
