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
from google.cloud import storage
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

        # Google Cloud Storage Configuration
        self.gcs_bucket_name = os.getenv('GCS_BUCKET_NAME')
        self.gcs_project_id = os.getenv('GCS_PROJECT_ID')

        # Validate required environment variables
        self._validate_config()

        # Initialize GCS client
        self.gcs_client = storage.Client(project=self.gcs_project_id)
        self.bucket = self.gcs_client.bucket(self.gcs_bucket_name)

    def _validate_config(self):
        """Validate that all required environment variables are set."""
        required_vars = [
            'AWT_USERNAME', 'AWT_PASSWORD', 'AWT_API_KEY',
            'GCS_BUCKET_NAME', 'GCS_PROJECT_ID'
        ]

        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests."""
        return {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
            'Authorization': f'Bearer {self._get_access_token()}'
        }

    def _get_access_token(self) -> str:
        """Obtain access token using username and password."""
        auth_url = f"{self.base_url}/auth/login"
        auth_data = {
            'username': self.api_username,
            'password': self.api_password
        }

        try:
            response = requests.post(auth_url, json=auth_data)
            response.raise_for_status()
            token_data = response.json()
            return token_data['access_token']
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to authenticate: {e}")
            raise

    def _is_first_run(self) -> bool:
        """Check if this is the first run by looking for a marker file in GCS."""
        marker_blob = self.bucket.blob('awt_sync/.first_run_complete')
        return not marker_blob.exists()

    def _mark_first_run_complete(self):
        """Mark that the first run has been completed."""
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
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"awt_tracking_data_initial_{timestamp}.json"
            self._upload_to_gcs(data, filename)

            # Mark first run as complete
            self._mark_first_run_complete()
            self._update_last_sync_time()
        else:
            logger.warning("No data received from API")

    def _perform_incremental_sync(self):
        """Perform incremental sync of latest data."""
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
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            filename = f"awt_tracking_data_incremental_{timestamp}.json"
            self._upload_to_gcs(data, filename)

            self._update_last_sync_time()
        else:
            logger.info("No new data available")

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
