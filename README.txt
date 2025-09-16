AWT Data Sync Setup Guide
=========================

This guide provides step-by-step instructions for setting up Google Cloud Storage to securely store AWT (Africa Wildlife Tracking) data pulled by the awt_data_sync.py script.

The script expects the following Google Cloud Storage configuration:
- Bucket name: Defined by GCS_BUCKET_NAME environment variable
- Project ID: Defined by GCS_PROJECT_ID environment variable
- Data files stored in: awt_data/ directory
- Metadata files stored in: awt_sync/ directory

Prerequisites
-------------
1. Google Cloud Platform (GCP) account
2. Google Cloud SDK (gcloud CLI) installed and configured
3. Basic knowledge of Google Cloud Console

Step 1: Create a Google Cloud Project
-------------------------------------

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "awt-data-sync")
5. Note the Project ID that gets generated (you'll need this for GCS_PROJECT_ID)

Step 2: Enable Required APIs
----------------------------

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Cloud Storage API
   - Cloud Storage JSON API

Step 3: Create a Service Account
--------------------------------

1. In Google Cloud Console, go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter service account details:
   - Name: awt-data-sync-service
   - Description: Service account for AWT data synchronization
   - ID: awt-data-sync-service (auto-generated)
4. Click "Create and Continue"
5. For Role assignment, click "Done" (we'll assign roles later)
6. After creation, click on the service account name
7. Go to the "Keys" tab
8. Click "Add Key" > "Create new key"
9. Select "JSON" format
10. Download the JSON key file (keep this secure!)

Step 4: Create the Storage Bucket
---------------------------------

1. In Google Cloud Console, go to "Cloud Storage" > "Buckets"
2. Click "Create Bucket"
3. Configure bucket settings:
   - Name: Choose a unique bucket name (e.g., "awt-tracking-data-[your-project-id]")
     This will be your GCS_BUCKET_NAME
   - Location type: Region (choose the region closest to you or your users)
   - Storage class: Standard
   - Access control: Uniform (recommended for security)
   - Protection tools: Enable "Prevent public access" and "Data encryption"
4. Click "Create"

Step 5: Configure IAM Permissions
----------------------------------

1. In Google Cloud Console, go to "IAM & Admin" > "IAM"
2. Find your service account (awt-data-sync-service@[project-id].iam.gserviceaccount.com)
3. Click the edit button (pencil icon)
4. Add the following roles:
   - Storage Object Admin (roles/storage.objectAdmin)
   - Storage Legacy Bucket Reader (roles/storage.legacyBucketReader)
5. Click "Save"

Step 6: Configure Bucket Security
----------------------------------

1. Go to "Cloud Storage" > "Buckets"
2. Click on your bucket name
3. Go to the "Permissions" tab
4. Remove any "allUsers" or "allAuthenticatedUsers" permissions if they exist
5. Ensure only your service account has access

Step 7: Set Up Lifecycle Policy (Optional but Recommended)
----------------------------------------------------------

1. In your bucket, go to the "Lifecycle" tab
2. Click "Add a rule"
3. Configure lifecycle rule:
   - Select "Delete object" action
   - Age: 365 days (or your preferred retention period)
   - Applies to: All objects
4. Click "Create"

Step 8: GitHub Secrets Configuration
------------------------------------

For GitHub Actions or other CI/CD systems, set up the following secrets:

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:

   AWT_USERNAME
   - Value: Your AWT API username

   AWT_PASSWORD
   - Value: Your AWT API password

   AWT_API_KEY
   - Value: Your AWT API key

   GCS_BUCKET_NAME
   - Value: The bucket name you created (e.g., "awt-tracking-data-[your-project-id]")

   GCS_PROJECT_ID
   - Value: Your Google Cloud Project ID

   GOOGLE_CREDENTIALS
   - Value: The entire contents of the service account JSON key file you downloaded

Step 9: Environment Variables for Local Testing
-----------------------------------------------

If running locally for testing, set these environment variables:

export AWT_USERNAME="your_awt_username"
export AWT_PASSWORD="your_awt_password"
export AWT_API_KEY="your_awt_api_key"
export GCS_BUCKET_NAME="your_bucket_name"
export GCS_PROJECT_ID="your_project_id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

Step 10: Test the Setup
-----------------------

1. Install dependencies:
   pip install -r requirements.txt

2. Run the script:
   python awt_data_sync.py

3. Check Google Cloud Storage:
   - Go to Cloud Storage > Buckets
   - Click on your bucket
   - You should see:
     - awt_data/ directory with data files
     - awt_sync/ directory with metadata files

Step 11: Set Up Scheduled Execution
-----------------------------------

For daily execution at 5 AM, you can use:

Option A: GitHub Actions
- Create .github/workflows/awt-sync.yml with scheduled trigger

Option B: Cron Job (Linux/Mac)
- Add to crontab: 0 5 * * * /usr/bin/python3 /path/to/awt_data_sync.py

Option C: Cloud Scheduler (GCP)
- Use Cloud Scheduler to trigger Cloud Functions or Cloud Run

Troubleshooting
---------------

1. Permission Denied Errors:
   - Verify service account has correct IAM roles
   - Check that GOOGLE_APPLICATION_CREDENTIALS is set correctly

2. API Authentication Errors:
   - Verify AWT credentials are correct
   - Check API key is valid and not expired

3. Bucket Not Found:
   - Verify GCS_BUCKET_NAME matches exactly
   - Check GCS_PROJECT_ID is correct

4. First Run Issues:
   - Ensure the script has write permissions to create awt_sync/ directory
   - Check network connectivity to both AWT API and Google Cloud Storage

Security Best Practices
-----------------------

1. Never commit service account keys to version control
2. Use environment variables or secret management for all credentials
3. Regularly rotate service account keys
4. Monitor access logs in Google Cloud Console
5. Use VPC Service Controls if additional security is needed
6. Enable bucket versioning if you need to track changes
7. Set up billing alerts to monitor costs

Cost Optimization
-----------------

1. Use Standard storage class initially
2. Set up lifecycle policies to delete old data
3. Monitor usage in Google Cloud Console > Billing
4. Consider using Nearline/Coldline storage for older data

Support
-------

For issues with:
- AWT API: Check https://api-next.africawildlifetracking.com/docs/
- Google Cloud Storage: https://cloud.google.com/storage/docs
- This script: Check the logs and error messages

File Structure After Setup
--------------------------

Your bucket should contain:
awt_data/
  awt_tracking_data_initial_YYYYMMDD_HHMMSS.json
  awt_tracking_data_incremental_YYYYMMDD_HHMMSS.json
awt_sync/
  .first_run_complete
  .last_sync
