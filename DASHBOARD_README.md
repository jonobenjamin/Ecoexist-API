# AWT Wildlife Tracking Dashboard

A beautiful, interactive web dashboard for visualizing wildlife tracking data from the Africa Wildlife Tracking (AWT) API.

## Features

- 🗺️ **Interactive Map**: Visualize animal movements with custom markers
- 📊 **Real-time Statistics**: View total animals, locations, and data ranges
- 🔍 **Advanced Filtering**: Filter by animal tag ID, date ranges, and latest positions
- 📋 **Data Table**: Browse recent locations with detailed information
- 📥 **Export Functionality**: Download filtered data as CSV
- 🎨 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Auto-refresh**: Updates data every 5 minutes

## Setup Instructions

### 1. Configure Data Source

The dashboard is already configured to load from your actual GCS data! It uses the same bucket and file path as your Python sync script:

- **Bucket**: Uses your `GCS_BUCKET_NAME` from GitHub secrets
- **File**: `awt_data/awt_tracking_data_cumulative.json` (same as Python script)

If you need to change the bucket name, update this line in `dashboard.html`:

```javascript
const bucketName = 'your-actual-bucket-name'; // Update this
```

### 2. Make GCS Data Public (Required)

The dashboard loads data directly from GCS, so the file must be publicly accessible:

1. Go to your Google Cloud Storage bucket
2. Find your `awt_data/awt_tracking_data_cumulative.json` file
3. Click on the file → Permissions tab
4. Add a new permission:
   - Entity: Public
   - Role: Storage Object Viewer

**⚠️ Warning**: Making data public means anyone can access it. Consider authentication if your data is sensitive.

### 3. Alternative: Use API Endpoint

For production use with authentication, create a simple API endpoint that serves your data:

```javascript
// Example Node.js endpoint
app.get('/api/awt-data', async (req, res) => {
    try {
        const data = await loadFromGCS();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});
```

Then update the fetch URL in the dashboard:
```javascript
const response = await fetch('/api/awt-data');
```

## File Structure

```
├── dashboard.html          # Main dashboard file
├── DASHBOARD_README.md     # This documentation
├── awt_data_sync.py       # Your data sync script
├── requirements.txt       # Python dependencies
└── .github/
    └── workflows/
        └── awt_sync.yml   # GitHub Actions workflow
```

## Data Format

The dashboard expects JSON data in this format (as provided by AWT API):

```json
[
  {
    "recordId": 123456,
    "tagId": 1337,
    "timestamp": 1583020800,
    "latitude": -25.730598,
    "longitude": 28.219429,
    "temperature": 24,
    "voltage": 3.67,
    "movement": true,
    "speed": 10,
    "accelerometer": {
      "x": 9997,
      "y": 364,
      "z": -14998
    },
    "hdop": "10m",
    "alarm": false,
    "coverage": true
  }
]
```

## Deployment Options

### Option 1: GitHub Pages (Free)

1. Push the `dashboard.html` file to your GitHub repository
2. Go to Settings → Pages
3. Set source to "Deploy from a branch"
4. Select your main branch and `/` folder
5. Access at: `https://yourusername.github.io/repository-name/dashboard.html`

### Option 2: Netlify (Free)

1. Drag and drop `dashboard.html` to [netlify.com](https://netlify.com)
2. Get a free HTTPS URL instantly

### Option 3: Your Own Server

Upload `dashboard.html` to any web server. Works with:
- Apache/Nginx
- AWS S3 + CloudFront
- Vercel
- Any static hosting service

## Customization

### Colors and Styling

Edit the CSS in the `<style>` section to match your branding:

```css
.navbar {
    background: linear-gradient(135deg, #your-color, #your-color);
}
```

### Map Settings

Modify the map initialization:

```javascript
// Change default center and zoom
map = L.map('map').setView([latitude, longitude], zoom_level);

// Add different basemap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri'
}).addTo(map);
```

### Auto-refresh Interval

Change the refresh rate (currently 5 minutes):

```javascript
// Update every 10 minutes
setInterval(loadData, 600000);
```

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Troubleshooting

### Data Not Loading

1. **Check browser console** for specific error messages
2. **Verify GCS bucket permissions** - the file must be publicly accessible
3. **Check bucket name** - verify the bucket name in `dashboard.html` matches your `GCS_BUCKET_NAME` secret
4. **Ensure file exists** - check that `awt_data/awt_tracking_data_cumulative.json` exists in your bucket
5. **CORS issues** - if accessing from a different domain, you may need an API proxy

### Map Not Displaying

1. Check internet connection
2. Verify Leaflet CDN is accessible
3. Ensure proper latitude/longitude values in data

### Performance Issues

- Limit data points for large datasets
- Consider pagination for data table
- Use clustering for dense point distributions

## License

This dashboard is provided as-is for educational and research purposes. Please respect wildlife privacy and data protection regulations when sharing location data.

## Contributing

Feel free to submit issues and enhancement requests!
