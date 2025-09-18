#!/usr/bin/env python3
"""
AWT Data Sync Script
Pulls wildlife tracking data from Africa Wildlife Tracking API and uploads to Google Cloud Storage.
Supports initial 90-day data pull and daily incremental updates.
"""

import os
import json
import requests
from datetime import datetime, timedelta
import logging
from typing import Optional, Dict, Any


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AWTDataSync:
    def __init__(self):
        # API Configuration
        self.base_url = "https://api-next.africawildlifetracking.com"
        self.api_username = os.getenv('AWT_USERNAME')
        self.api_password = os.getenv('AWT_PASSWORD')
        self.api_key = os.getenv('AWT_API_KEY')

        # Storage Configuration (Google Cloud Storage)
        self.gcs_available = False

        # Validate required environment variables
        self._validate_config()

        # Initialize Google Cloud Storage
        self._initialize_gcs()

    def _validate_config(self):
        """Validate that all required environment variables are set."""
        required_vars = [
            'AWT_USERNAME', 'AWT_PASSWORD', 'AWT_API_KEY'
        ]
        optional_vars = [
            'GCS_BUCKET_NAME', 'GCS_PROJECT_ID'
        ]

        missing_vars = [var for var in required_vars if not os.getenv(var) or os.getenv(var) == ""]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

        # Check optional vars and warn if missing
        missing_optional = [var for var in optional_vars if not os.getenv(var) or os.getenv(var) == ""]
        if missing_optional:
            print(f"Warning: Optional storage variables not set: {', '.join(missing_optional)}")
            print("GCS storage will be disabled")

    def _initialize_gcs(self):
        """Initialize Google Cloud Storage."""
        # Google Cloud Storage Configuration
        self.gcs_bucket_name = os.getenv('GCS_BUCKET_NAME')
        self.gcs_project_id = os.getenv('GCS_PROJECT_ID')

        if self.gcs_project_id and self.gcs_bucket_name:
            try:
                from google.cloud import storage
                self.gcs_client = storage.Client(project=self.gcs_project_id)
                self.bucket = self.gcs_client.bucket(self.gcs_bucket_name)
                # Test the connection by trying to get bucket info
                self.bucket.reload()
                self.gcs_available = True
                print("✓ Google Cloud Storage available")
            except Exception as e:
                print(f"Warning: Google Cloud Storage not available: {e}")
                self.gcs_available = False
        else:
            print("GCS_PROJECT_ID or GCS_BUCKET_NAME not set, Google Cloud Storage disabled")
            self.gcs_available = False

    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests."""
        # Get bearer token using API key + credentials
        token = self._get_access_token()

        return {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
            'Authorization': f'Bearer {token}'
        }

    def _get_access_token(self) -> str:
        """Obtain bearer token using API key + user credentials."""
        # Use API key + username + password for authentication
        auth_url = f"{self.base_url}/token"
        auth_data = {
            'api_key': self.api_key,
            'username': self.api_username,
            'password': self.api_password
        }

        try:
            response = requests.post(auth_url, json=auth_data, timeout=10)
            response.raise_for_status()
            token_data = response.json()

            # Extract the bearer token
            token = token_data.get('access_token') or token_data.get('token') or token_data.get('bearer_token')
            if token:
                logger.info("Successfully obtained bearer token")
                return token
            else:
                raise ValueError(f"No token found in response: {token_data}")

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to authenticate: {e}")
            raise

    def _is_first_run(self) -> bool:
        """Check if this is the first run by looking for a marker file in GCS."""
        if not self.gcs_available:
            print("GCS not available, assuming first run")
            return True
        try:
            marker_blob = self.bucket.blob('awt_sync/.first_run_complete')
            return not marker_blob.exists()
        except Exception as e:
            print(f"GCS error in _is_first_run: {e}, assuming first run")
            return True

    def _mark_first_run_complete(self):
        """Mark that the first run has been completed."""
        if not self.gcs_available:
            print("GCS not available, skipping first run marker")
            return
        marker_blob = self.bucket.blob('awt_sync/.first_run_complete')
        marker_blob.upload_from_string(
            json.dumps({
                'completed_at': datetime.utcnow().isoformat(),
                'status': 'completed'
            }),
            content_type='application/json'
        )

    def _get_last_sync_time(self) -> Optional[datetime]:
        """Get the timestamp of the last successful sync."""
        if not self.gcs_available:
            print("GCS not available, no last sync time")
            return None
        try:
            last_sync_blob = self.bucket.blob('awt_sync/.last_sync')
            if last_sync_blob.exists():
                last_sync_data = json.loads(last_sync_blob.download_as_text())
                return datetime.fromisoformat(last_sync_data['last_sync_time'])
        except Exception as e:
            logger.warning(f"Could not retrieve last sync time: {e}")
        return None

    def _update_last_sync_time(self):
        """Update the last sync timestamp."""
        if not self.gcs_available:
            print("GCS not available, skipping last sync update")
            return
        last_sync_blob = self.bucket.blob('awt_sync/.last_sync')
        last_sync_blob.upload_from_string(
            json.dumps({
                'last_sync_time': datetime.utcnow().isoformat()
            }),
            content_type='application/json'
        )

    def _fetch_data(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Fetch data from AWT API."""
        url = f"{self.base_url}/api/v1/tracking-data"

        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date

        try:
            headers = self._get_auth_headers()
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch data from AWT API: {e}")
            raise

    def _upload_to_gcs(self, data: Dict[str, Any], filename: str):
        """Upload data to Google Cloud Storage."""
        if not self.gcs_available:
            print(f"GCS not available, would upload {filename} with {len(str(data))} chars")
            return

        try:
            blob = self.bucket.blob(f"awt_data/{filename}")
            blob.upload_from_string(
                json.dumps(data, indent=2),
                content_type='application/json'
            )
            logger.info(f"Successfully uploaded {filename} to GCS")
        except Exception as e:
            logger.error(f"Failed to upload {filename} to GCS: {e}")
            raise

    def sync_data(self):
        """Main sync function that handles both initial and incremental syncs."""
        logger.info("Starting AWT data sync...")

        if self._is_first_run():
            logger.info("Performing initial 90-day data sync...")
            self._perform_initial_sync()
        else:
            logger.info("Performing incremental daily sync...")
            self._perform_incremental_sync()

        logger.info("AWT data sync completed successfully")

    def _perform_initial_sync(self):
        """Perform initial sync of 90 days of data."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=90)

        logger.info(f"Fetching data from {start_date.date()} to {end_date.date()}")

        data = self._fetch_data(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )

        if data:
            # Create initial cumulative dataset
            cumulative_filename = "awt_tracking_data_cumulative.json"
            blob = self.bucket.blob(f"awt_data/{cumulative_filename}")
            blob.upload_from_string(
                json.dumps(data, indent=2),
                content_type='application/json'
            )
            logger.info(f"✓ Created initial cumulative dataset with {len(data) if isinstance(data, list) else 1} records")

            # Mark first run as complete
            self._mark_first_run_complete()
            self._update_last_sync_time()
        else:
            logger.warning("No data received from API")

    def _perform_incremental_sync(self):
        """Perform incremental sync of latest data and append to cumulative dataset."""
        last_sync = self._get_last_sync_time()
        if last_sync:
            start_date = last_sync
        else:
            # Fallback to last 24 hours if no sync time found
            start_date = datetime.utcnow() - timedelta(days=1)

        end_date = datetime.utcnow()

        logger.info(f"Fetching incremental data from {start_date.date()} to {end_date.date()}")

        data = self._fetch_data(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )

        if data:
            # Append new data to cumulative dataset
            self._append_to_cumulative_data(data)
            self._update_last_sync_time()
            logger.info(f"✓ Successfully added {len(data) if isinstance(data, list) else 1} new records to cumulative dataset")
        else:
            logger.info("No new data available")

    def _append_to_cumulative_data(self, new_data):
        """Append new data to GCS."""
        try:
            if self.gcs_available:
                return self._append_to_gcs_cumulative(new_data)
            else:
                logger.warning("GCS not available - data not saved!")
                return
        except Exception as e:
            logger.error(f"Failed to append to GCS: {e}")

    def _append_to_gcs_cumulative(self, new_data):
        """Append new data to GCS (legacy method)."""
        cumulative_filename = "awt_tracking_data_cumulative.json"

        try:
            # Try to download existing cumulative data
            existing_data = []
            try:
                blob = self.bucket.blob(f"awt_data/{cumulative_filename}")
                if blob.exists():
                    existing_json = blob.download_as_text()
                    existing_data = json.loads(existing_json)
                    logger.info(f"Downloaded existing cumulative data with {len(existing_data)} records")
                else:
                    logger.info("No existing cumulative data found, starting fresh")
            except Exception as e:
                logger.warning(f"Could not download existing data: {e}, starting fresh")

            # Append new data
            if isinstance(existing_data, list) and isinstance(new_data, list):
                combined_data = existing_data + new_data
            elif isinstance(existing_data, list):
                combined_data = existing_data + [new_data]
            elif isinstance(new_data, list):
                combined_data = [existing_data] + new_data
            else:
                combined_data = [existing_data, new_data]

            # Upload combined data
            blob = self.bucket.blob(f"awt_data/{cumulative_filename}")
            blob.upload_from_string(
                json.dumps(combined_data, indent=2),
                content_type='application/json'
            )
            logger.info(f"✓ Uploaded cumulative dataset with {len(combined_data)} total records")

        except Exception as e:
            logger.error(f"Failed to append to GCS: {e}")
            # Fallback: upload new data as separate incremental file
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"awt_tracking_data_incremental_{timestamp}.json"
            self._upload_to_gcs(new_data, filename)
            logger.warning(f"Fell back to separate incremental file: {filename}")

def main():
    """Main entry point."""
    try:
        sync = AWTDataSync()
        sync.sync_data()
    except Exception as e:
        logger.error(f"AWT data sync failed: {e}")
        raise

if __name__ == "__main__":
    main()
