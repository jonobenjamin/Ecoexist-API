#!/usr/bin/env node

/**
 * AWT Data Averaging Script
 *
 * This script fetches raw AWT tracking data and generates rolling 7-day averages
 * for privacy protection. Each averaged point represents the mean location
 * of an animal over a 7-day rolling window.
 *
 * Rolling average logic:
 * - Day 7: average of days 1-7
 * - Day 8: average of days 2-8
 * - Day 9: average of days 3-9
 * - etc.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const RAW_DATA_URL = 'https://ecoexist-api.vercel.app/api/awt-data';
const AUTH_HEADER = 'Basic ' + Buffer.from('jono:password').toString('base64');
const OUTPUT_FILE = path.join(__dirname, 'data', 'awt_averaged_data.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

/**
 * Fetch raw AWT data from the API
 */
async function fetchRawData() {
    return new Promise((resolve, reject) => {
        console.log('Fetching raw AWT data...');

        const options = {
            headers: {
                'Authorization': AUTH_HEADER,
                'User-Agent': 'AWT-Data-Averaging-Script/1.0'
            }
        };

        https.get(RAW_DATA_URL, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`✓ Fetched ${jsonData.length} raw data points`);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON response: ${error.message}`));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Network error: ${error.message}`));
        });
    });
}

/**
 * Calculate rolling 7-day averages for a single animal's data
 */
function calculateRollingAverages(animalData) {
    if (!animalData || animalData.length === 0) {
        return [];
    }

    // Sort data by timestamp (oldest first)
    const sortedData = animalData.sort((a, b) => a.timestamp - b.timestamp);
    const averagedData = [];

    // For each day starting from day 7, calculate rolling average of previous 7 days
    for (let i = 6; i < sortedData.length; i++) {
        const windowStart = i - 6; // Start of 7-day window
        const windowData = sortedData.slice(windowStart, i + 1); // Days windowStart to i (7 days)

        // Calculate average latitude and longitude
        const avgLat = windowData.reduce((sum, point) => sum + point.latitude, 0) / windowData.length;
        const avgLng = windowData.reduce((sum, point) => sum + point.longitude, 0) / windowData.length;

        // Use the timestamp of the last day in the window (day i)
        const timestamp = sortedData[i].timestamp;

        // Create averaged data point
        averagedData.push({
            tagId: sortedData[i].tagId,
            timestamp: timestamp,
            latitude: Number(avgLat.toFixed(6)),
            longitude: Number(avgLng.toFixed(6)),
            daysUsed: windowData.length, // Number of days used in this average (should be 7)
            originalPoints: windowData.length,
            dateRange: {
                start: new Date(sortedData[windowStart].timestamp * 1000).toISOString().split('T')[0],
                end: new Date(sortedData[i].timestamp * 1000).toISOString().split('T')[0]
            }
        });
    }

    return averagedData;
}

/**
 * Process all animal data and generate rolling averages
 */
function processData(rawData) {
    console.log('Processing data for rolling averages...');

    // Filter out erroneous data points above the equator (Botswana is in Southern Hemisphere)
    const originalCount = rawData.length;
    const filteredData = rawData.filter(point => point.latitude < 0);
    const filteredCount = originalCount - filteredData.length;

    if (filteredCount > 0) {
        console.log(`Filtered out ${filteredCount} erroneous data points above the equator`);
    }
    console.log(`Processing ${filteredData.length} valid records...`);

    // Group data by tagId
    const dataByTag = {};
    filteredData.forEach(point => {
        if (!dataByTag[point.tagId]) {
            dataByTag[point.tagId] = [];
        }
        dataByTag[point.tagId].push(point);
    });

    console.log(`Found ${Object.keys(dataByTag).length} unique animals`);

    // Calculate rolling averages for each animal
    const allAveragedData = [];
    let totalOriginalPoints = 0;
    let totalAveragedPoints = 0;

    Object.keys(dataByTag).forEach(tagId => {
        const animalData = dataByTag[tagId];
        totalOriginalPoints += animalData.length;

        console.log(`Processing Tag ${tagId}: ${animalData.length} raw points`);

        const averagedData = calculateRollingAverages(animalData);
        allAveragedData.push(...averagedData);

        console.log(`  → Generated ${averagedData.length} averaged points`);
        totalAveragedPoints += averagedData.length;
    });

    // Sort final data by timestamp
    allAveragedData.sort((a, b) => a.timestamp - b.timestamp);

    console.log('\n📊 Summary:');
    console.log(`  Original points: ${totalOriginalPoints}`);
    console.log(`  Averaged points: ${totalAveragedPoints}`);
    console.log(`  Reduction: ${((1 - totalAveragedPoints/totalOriginalPoints) * 100).toFixed(1)}%`);

    return allAveragedData;
}

/**
 * Save averaged data to JSON file
 */
function saveAveragedData(averagedData) {
    console.log(`\n💾 Saving averaged data to ${OUTPUT_FILE}...`);

    const outputData = {
        metadata: {
            generated_at: new Date().toISOString(),
            description: 'Rolling 7-day averaged locations for privacy protection',
            rolling_window_days: 7,
            total_animals: new Set(averagedData.map(d => d.tagId)).size,
            total_points: averagedData.length,
            privacy_note: 'Individual GPS points are averaged over 7-day rolling windows to protect animal privacy and prevent poaching'
        },
        data: averagedData
    };

    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
        console.log(`✓ Successfully saved ${averagedData.length} averaged data points`);
        console.log(`✓ File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
        console.error('❌ Failed to save averaged data:', error.message);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        console.log('🚀 Starting AWT Data Averaging Process\n');

        // Step 1: Fetch raw data
        const rawData = await fetchRawData();

        // Step 2: Process and calculate rolling averages
        const averagedData = processData(rawData);

        // Step 3: Save averaged data
        saveAveragedData(averagedData);

        console.log('\n✅ AWT data averaging completed successfully!');
        console.log('📁 Output file:', OUTPUT_FILE);

    } catch (error) {
        console.error('\n❌ Error during data averaging process:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    fetchRawData,
    calculateRollingAverages,
    processData,
    saveAveragedData
};
