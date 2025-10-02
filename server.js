// Simple Node.js API server for secure AWT data access
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Enable CORS for all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Handle preflight requests
app.options('*', cors());

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

// Debug logging
console.log('=== Environment Variables ===');
console.log('PORT:', process.env.PORT);
console.log('GCS_PROJECT_ID:', process.env.GCS_PROJECT_ID ? 'SET' : 'NOT SET');
console.log('GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME ? 'SET' : 'NOT SET');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET (length: ' + process.env.GOOGLE_APPLICATION_CREDENTIALS.length + ')' : 'NOT SET');
console.log('=============================');

// Initialize Google Cloud Storage
let storage;
let credentials = null;

try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Try to parse credentials
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log('Credentials parsed successfully');
        storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
            credentials: credentials
        });
    } else {
        console.warn('No credentials found, using default');
        storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID
        });
    }
} catch (error) {
    console.error('Error parsing credentials:', error.message);
    storage = new Storage({
        projectId: process.env.GCS_PROJECT_ID
    });
}

const bucketName = process.env.GCS_BUCKET_NAME;
const fileName = 'awt_data/awt_tracking_data_cumulative.json';

console.log('Using bucket:', bucketName);
console.log('Using file:', fileName);

// API endpoint to get wildlife data
app.get('/api/awt-data', authenticate, async (req, res) => {
    try {
        console.log('Authenticated request for AWT data');

        if (!bucketName) {
            return res.status(500).json({ 
                error: 'Server configuration error: GCS_BUCKET_NAME not set' 
            });
        }

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);

        console.log('Attempting to download from GCS...');
        
        // Download the file content
        const [content] = await file.download();
        const data = JSON.parse(content.toString());

        console.log(`Successfully served ${data.length} records`);
        res.json(data);

    } catch (error) {
        console.error('Error fetching data from GCS:', error);
        res.status(500).json({
            error: 'Failed to fetch wildlife data',
            details: error.message,
            bucket: bucketName,
            file: fileName
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        config: {
            bucketConfigured: !!bucketName,
            credentialsConfigured: !!credentials,
            projectId: process.env.GCS_PROJECT_ID || 'not set'
        }
    });
});

app.listen(port, () => {
    console.log(`\n🚀 AWT Dashboard API server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔐 API endpoint: http://localhost:${port}/api/awt-data\n`);
});
