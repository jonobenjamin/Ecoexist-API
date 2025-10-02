// Simple Node.js API server for secure AWT data access
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple authentication middleware
function authenticate(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = auth.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Simple auth check - replace with proper authentication in production
    if (username === 'jono' && password === 'password') {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
}

// Initialize Google Cloud Storage
const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const bucketName = process.env.GCS_BUCKET_NAME;
const fileName = 'awt_data/awt_tracking_data_cumulative.json';

// API endpoint to get wildlife data
app.get('/api/awt-data', authenticate, async (req, res) => {
    try {
        console.log('Authenticated request for AWT data');

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);

        // Download the file content
        const [content] = await file.download();
        const data = JSON.parse(content.toString());

        console.log(`Serving ${data.length} records`);
        res.json(data);

    } catch (error) {
        console.error('Error fetching data from GCS:', error);
        res.status(500).json({
            error: 'Failed to fetch wildlife data',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`AWT Dashboard API server running on port ${port}`);
    console.log(`GCS Bucket: ${bucketName}`);
    console.log(`Data File: ${fileName}`);
});
