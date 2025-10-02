module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let credentials = null;
    try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        }
    } catch (e) {
        // Ignore parsing errors
    }

    return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        config: {
            bucketConfigured: !!process.env.GCS_BUCKET_NAME,
            credentialsConfigured: !!credentials,
            projectId: process.env.GCS_PROJECT_ID || 'not set'
        }
    });
};

