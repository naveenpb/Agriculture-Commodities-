const axios = require('axios');
const Price = require('../models/commodityModel');
require('dotenv').config();

// Improved date parsing
const parseArrivalDate = (dateString) => {
    try {
        if (typeof dateString === 'string') {
            const unspacedDate = dateString.trim().replace(/\/\//g, '/'); // Normalize slashes
            const [day, month, year] = unspacedDate.split('/');
            if (!day || !month || !year) throw new Error(`Invalid date format: ${dateString}`);
            const dateObj = new Date(year, month - 1, day); // JS months are 0-indexed
            if (isNaN(dateObj.getTime())) throw new Error(`Invalid parsed date: ${dateString}`);
            return dateObj;
        }
        return dateString; // Return as is if not a string
    } catch (error) {
        console.error(`Error parsing date: ${dateString}, Error: ${error.message}`);
        return null; // Return null to handle in calling code
    }
};

// Enhanced record updates
const addCommodityData = async (commodityData) => {
    const { commodity, arrival_date, state, district, market, variety, grade, min_price, max_price, modal_price } = commodityData;
    if (!commodity || !arrival_date || !state || !district || !market) {
        console.error(`Missing required fields for record:`, commodityData);
        return; // Skip this record
    }

    try {
        const formattedDate = parseArrivalDate(arrival_date);
        if (!formattedDate) return; // Skip invalid dates
        const arrivalDate = new Date(formattedDate);

        // Check if the state already exists in the database
        const existingState = await Price.findOne({ state });
        if (!existingState) {
            console.log(`State ${state} not found, creating new state.`);
            await Price.create({
                state,
                commodities: [{
                    commodity,
                    markets: [{
                        market,
                        records: [{
                            arrival_date: arrivalDate,
                            district,
                            variety,
                            grade,
                            min_price,
                            max_price,
                            modal_price,
                        }],
                    }],
                }],
            });
            return;
        }

        // Update logic for existing state
        const commodityRecord = existingState.commodities.find(c => c.commodity === commodity);
        if (!commodityRecord) {
            existingState.commodities.push({
                commodity,
                markets: [{
                    market,
                    records: [{
                        arrival_date: arrivalDate,
                        district,
                        variety,
                        grade,
                        min_price,
                        max_price,
                        modal_price,
                    }],
                }],
            });
        } else {
            const marketRecord = commodityRecord.markets.find(m => m.market === market);
            if (!marketRecord) {
                commodityRecord.markets.push({
                    market,
                    records: [{
                        arrival_date: arrivalDate,
                        district,
                        variety,
                        grade,
                        min_price,
                        max_price,
                        modal_price,
                    }],
                });
            } else {
                const existingRecord = marketRecord.records.find(r => r.arrival_date.getTime() === arrivalDate.getTime());
                if (!existingRecord) {
                    marketRecord.records.push({
                        arrival_date: arrivalDate,
                        district,
                        variety,
                        grade,
                        min_price,
                        max_price,
                        modal_price,
                    });

                    // Sort records and keep only the latest 3
                    marketRecord.records.sort((a, b) => new Date(b.arrival_date) - new Date(a.arrival_date));
                    if (marketRecord.records.length > 3) {
                        marketRecord.records = marketRecord.records.slice(0, 3);
                    }
                }
            }
        }

        // Save updated document
        await existingState.save();
    } catch (error) {
        console.error(`Error adding commodity data for ${commodity}:`, error.message);
        throw new Error('Failed to add commodity data');
    }
};

// Paginated API fetching
const fetchAllPages = async (apiUrl, apiKey) => {
    let offset = 0;
    const limit = 4999; // Adjust based on API's maximum allowed limit
    let allRecords = [];

    try {
        while (true) {
            console.log(`Fetching records from offset ${offset}`);
            const response = await axios.get(`${apiUrl}?api-key=${apiKey}&format=json&offset=${offset}&limit=${limit}`);
            const records = response.data.records;

            if (!records || records.length === 0) {
                console.log('No more records to fetch.'); // Exit loop when no more records
                break;
            }

            allRecords = allRecords.concat(records); // Accumulate records
            offset += records.length; // Adjust offset based on the number of records fetched

            // Log progress
            console.log(`Fetched ${records.length} records. Total so far: ${allRecords.length}`);
        }
    } catch (error) {
        console.error(`Error during pagination fetch: ${error.message}`);
        throw new Error('Failed to fetch all pages from API');
    }

    return allRecords;
};


// Controller function
const updateCommodityData = async (req, res) => {
    try {
        const apiUrl = process.env.API_URL;
        const apiKey = process.env.API_KEY;
        const records = await fetchAllPages(apiUrl, apiKey);

        let successCount = 0;
        let failureCount = 0;

        for (const record of records) {
            try {
                await addCommodityData(record);
                successCount++;
            } catch (error) {
                console.error(`Error processing record: ${error.message}`);
                failureCount++;
            }
        }

        res.status(200).json({ message: 'Commodity data updated', successCount, failureCount });
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ message: 'Error fetching data', error: error.message });
    }
};

module.exports = {
    updateCommodityData,
    addCommodityData,
};
