const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // Enable CORS for all requests first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept, User-Agent');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request for public data');
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        console.log('Rejecting non-GET request for public data:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log request details for debugging
    console.log('Request method:', req.method);
    console.log('Request headers keys:', Object.keys(req.headers));
    console.log('Origin header:', req.headers.origin);
    console.log('Authorization header present:', !!req.headers.authorization);

    try {
        console.log('Serving public averaged AWT data');

        // Path to the averaged data file
        const dataFilePath = path.join(__dirname, '..', 'data', 'awt_averaged_data.json');

        // Check if the file exists
        if (!fs.existsSync(dataFilePath)) {
            console.log('Averaged data file not found:', dataFilePath);
            return res.status(404).json({
                error: 'Averaged data not available',
                message: 'The privacy-protected averaged data has not been generated yet. Please try again later.'
            });
        }

        // Read the averaged data file
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        const averagedData = JSON.parse(fileContent);

        // Extract just the data array for backward compatibility
        const dataToServe = averagedData.data || averagedData;

        console.log(`Successfully served ${dataToServe.length} averaged data points`);

        // Add cache headers for public data (cache for 5 minutes)
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Last-Modified', new Date().toUTCString());

        return res.status(200).json(dataToServe);

    } catch (error) {
        console.error('Error serving public averaged data:', error);
        return res.status(500).json({
            error: 'Failed to serve averaged wildlife data',
            details: error.message
        });
    }
};
