// const { Storage } = require('@google-cloud/storage');

// // Initialize Google Cloud Storage
// let storage;
// let credentials = null;

// try {
//     if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//         credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
//         storage = new Storage({
//             projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
//             credentials: credentials
//         });
//     } else {
//         storage = new Storage({
//             projectId: process.env.GCS_PROJECT_ID
//         });
//     }
// } catch (error) {
//     console.error('Error parsing credentials:', error.message);
// }

// const bucketName = process.env.GCS_BUCKET_NAME;
// const fileName = 'awt_data/awt_tracking_data_cumulative.json';

// module.exports = async (req, res) => {
//     // Enable CORS
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     res.setHeader('Access-Control-Allow-Credentials', 'true');

//     // Handle preflight OPTIONS request
//     if (req.method === 'OPTIONS') {
//         return res.status(200).end();
//     }

//     // Only allow GET requests
//     if (req.method !== 'GET') {
//         return res.status(405).json({ error: 'Method not allowed' });
//     }

//     // Check authentication
//     const auth = req.headers.authorization;
//     if (!auth || !auth.startsWith('Basic ')) {
//         return res.status(401).json({ error: 'Authentication required' });
//     }

//     const base64Credentials = auth.split(' ')[1];
//     const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
//     const [username, password] = credentials.split(':');

//     if (username !== 'jono' || password !== 'password') {
//         return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Fetch data from GCS
//     try {
//         console.log('Authenticated request for AWT data');

//         if (!bucketName) {
//             return res.status(500).json({ 
//                 error: 'Server configuration error: GCS_BUCKET_NAME not set' 
//             });
//         }

//         const bucket = storage.bucket(bucketName);
//         const file = bucket.file(fileName);

//         console.log('Attempting to download from GCS...');
        
//         const [content] = await file.download();
//         const data = JSON.parse(content.toString());

//         console.log(`Successfully served ${data.length} records`);
//         return res.status(200).json(data);

//     } catch (error) {
//         console.error('Error fetching data from GCS:', error);
//         return res.status(500).json({
//             error: 'Failed to fetch wildlife data',
//             details: error.message
//         });
//     }
// };
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
const fileName = 'awt_data/awt_tracking_data_cumulative.json';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log request details for debugging
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);

    // Check authentication
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = auth.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // TODO: Change these credentials to your own secure values
    const VALID_USERNAME = 'jono';
    const VALID_PASSWORD = 'password';
    
    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch data from GCS
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
        
        const [content] = await file.download();
        const data = JSON.parse(content.toString());

        console.log(`Successfully served ${data.length} records`);
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching data from GCS:', error);
        return res.status(500).json({
            error: 'Failed to fetch wildlife data',
            details: error.message
        });
    }
};


