# 🗄️ Google Cloud Storage Setup Guide

This guide helps you set up Google Cloud Storage (GCS) for storing your AWT tracking data.

## Prerequisites

1. **Google Cloud Project**: Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. **GCS Bucket**: Create a storage bucket in your project
3. **Service Account**: Create a service account with Storage Admin permissions

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID**

## Step 2: Create Storage Bucket

1. In Google Cloud Console, go to **Cloud Storage** → **Buckets**
2. Click **Create Bucket**
3. Choose a unique bucket name (e.g., `your-project-awt-data`)
4. Set storage class to **Standard**
5. Set location to your preferred region
6. Click **Create**

## Step 3: Create Service Account

1. In Google Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `awt-data-sync-service`
4. Description: `Service account for AWT data synchronization`
5. Click **Create and Continue**
6. Grant role: **Storage Admin** (or **Storage Object Admin**)
7. Click **Done**

## Step 4: Generate Service Account Key

1. Find your service account in the list
2. Click the **Actions** menu (three dots) → **Manage keys**
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create** - this downloads the key file

## Step 5: Set GitHub Secrets

In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions** and add:

```
GOOGLE_CREDENTIALS = <entire JSON content from your service account key file>
GCS_PROJECT_ID = <your Google Cloud project ID>
GCS_BUCKET_NAME = <your GCS bucket name>
AWT_USERNAME = <your AWT API username>
AWT_PASSWORD = <your AWT API password>
AWT_API_KEY = <your AWT API key>
```

## Step 6: Test the Setup

1. The GitHub Actions workflow will run automatically at 5 AM UTC daily
2. You can also trigger it manually from the Actions tab
3. Check the workflow logs to ensure data is being saved to GCS
4. Your cumulative data will be stored as `awt_tracking_data_cumulative.json` in your GCS bucket

## Troubleshooting

- **JSONDecodeError**: Make sure your `GOOGLE_CREDENTIALS` secret contains the complete, valid JSON from your service account key
- **Bucket not found**: Verify your `GCS_BUCKET_NAME` and `GCS_PROJECT_ID` are correct
- **Permission denied**: Ensure your service account has Storage Admin permissions

## Data Storage

- **Format**: JSON array of tracking records
- **Location**: `gs://your-bucket/awt_tracking_data_cumulative.json`
- **Updates**: New data is appended daily at 5 AM UTC
- **Cost**: Very low cost for storage (typically <$0.01/month for small datasets)
