// API endpoint to serve historical wildlife data from GCS - paginated by year
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
let storage;
let credentials = null;

try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
            credentials: credentials
        });
    } else {
        storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID
        });
    }
} catch (error) {
    console.error('Error parsing credentials:', error.message);
}

const bucketName = process.env.GCS_BUCKET_NAME;
const historicalFileName = 'historical_data.json'; // Path to historical data in GCS (root of bucket)

module.exports = async (req, res) => {
    // Enable CORS for all requests first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept, User-Agent');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request for historical data by year');
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        console.log('Rejecting non-GET request:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication (same as main API)
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = auth.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    const VALID_USERNAME = 'jono';
    const VALID_PASSWORD = 'password';

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get year parameter from query string
    const year = req.query.year;
    if (!year || isNaN(parseInt(year))) {
        return res.status(400).json({ 
            error: 'Year parameter required',
            usage: '/api/historical-data-by-year?year=2024'
        });
    }

    // Fetch historical data from GCS and filter by year
    try {
        console.log(`Authenticated request for historical AWT data - Year: ${year}`);

        if (!bucketName) {
            return res.status(500).json({
                error: 'Server configuration error: GCS_BUCKET_NAME not set'
            });
        }

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(historicalFileName);

        console.log('Attempting to download historical data from GCS...');
        console.log('Bucket:', bucketName);
        console.log('File:', historicalFileName);
        console.log('Filtering for year:', year);

        // Check file size first
        const [metadata] = await file.getMetadata();
        const fileSizeMB = (metadata.size / 1024 / 1024).toFixed(2);
        console.log(`File size: ${fileSizeMB} MB`);

        // Download the historical data file
        const startTime = Date.now();
        const [content] = await file.download();
        const downloadTime = Date.now() - startTime;
        console.log(`Downloaded in ${downloadTime}ms`);

        const parseStart = Date.now();
        const allHistoricalData = JSON.parse(content.toString());
        const parseTime = Date.now() - parseStart;
        console.log(`Parsed ${allHistoricalData.length} total records in ${parseTime}ms`);

        // Filter data for the requested year
        const requestedYear = parseInt(year);
        const yearStart = new Date(requestedYear, 0, 1).getTime() / 1000; // Jan 1 of year
        const yearEnd = new Date(requestedYear + 1, 0, 1).getTime() / 1000; // Jan 1 of next year

        console.log(`Filtering for year ${requestedYear}: ${yearStart} - ${yearEnd}`);

        const filterStart = Date.now();
        const yearData = allHistoricalData.filter(record => {
            return record.timestamp >= yearStart && record.timestamp < yearEnd;
        });
        const filterTime = Date.now() - filterStart;

        console.log(`Filtered to ${yearData.length} records for year ${year} in ${filterTime}ms`);
        console.log(`Total processing time: ${Date.now() - startTime}ms`);

        // Return filtered data
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(yearData);

    } catch (error) {
        console.error('Error fetching historical data from GCS:', error);

        // If the file doesn't exist, return empty array instead of error
        if (error.code === 404) {
            console.log('Historical data file not found in GCS, returning empty array');
            return res.status(200).json([]);
        }

        return res.status(500).json({
            error: 'Failed to fetch historical wildlife data',
            details: error.message
        });
    }
};

