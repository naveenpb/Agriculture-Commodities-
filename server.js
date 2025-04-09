require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const Price = require('./models/commodityModel'); // Update your model import
const path = require('path');
const commodityController = require('./controllers/commodityController');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs'); // Set EJS as the template engine

// Function to fetch and update commodity data (used in cron and server start)
const fetchAndUpdateCommodityData = async () => {
    try {
        console.log('Fetching and updating commodity data...');
        const apiUrl = process.env.API_URL || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
        const apiKey = process.env.API_KEY;
        const response = await axios.get(`${apiUrl}?api-key=${apiKey}&format=json&offset=0&limit=4999`);
        const records = response.data.records;

        // Add each commodity data to the database
        for (const record of records) {
            await commodityController.addCommodityData(record);
        }

        console.log('Commodity data update completed successfully.');
    } catch (error) {
        console.error('Error fetching data from API:', error.message);
    }
};

// Trigger fetch and update immediately when the server starts
fetchAndUpdateCommodityData();

// Cron job to fetch data every 15 minutes
cron.schedule('*/15 * * * *', fetchAndUpdateCommodityData);

// Routes
// Homepage: Fetch and display all states
app.get('/', async (req, res) => {
    try {
        const states = await Price.find().distinct('state'); // Fetch distinct states from the database
        res.render('homepage', { states });
    } catch (error) {
        console.error('Error fetching states:', error.message);
        res.status(500).send('Server Error');
    }
});

// Fetch commodities for a specific state
app.get('/state/:state', async (req, res) => {
    const { state } = req.params;
    try {
        const commoditiesData = await Price.findOne({ state }, { commodities: 1, _id: 0 });
        const commodities = commoditiesData ? commoditiesData.commodities.map(c => c.commodity) : [];
        res.render('commodities', { state, commodities });
    } catch (error) {
        console.error(`Error fetching commodities for state ${state}:`, error.message);
        res.status(500).send('Server Error');
    }
});

// Fetch markets for a specific commodity under a state
app.get('/state/:state/commodity/:commodity', async (req, res) => {
    const { state, commodity } = req.params;
    try {
        const stateData = await Price.findOne({ state, 'commodities.commodity': commodity }, { 'commodities.$': 1 });
        const markets = stateData && stateData.commodities[0] ? stateData.commodities[0].markets.map(m => m.market) : [];
        res.render('markets', { state, commodity, markets });
    } catch (error) {
        console.error(`Error fetching markets for commodity ${commodity} in state ${state}:`, error.message);
        res.status(500).send('Server Error');
    }
});

// Fetch records for a specific market under a commodity and state
app.get('/state/:state/commodity/:commodity/market/:market', async (req, res) => {
    const { state, commodity, market } = req.params;
    try {
        const stateData = await Price.findOne(
            { state, 'commodities.commodity': commodity },
            { 'commodities.$': 1 }
        );
        const marketData = stateData.commodities[0].markets.find(m => m.market === market);
        const records = marketData ? marketData.records : [];

        // Prepare data for the graph (previous 3 days' prices)
        const graphData = records.map(record => ({
            arrival_date: record.arrival_date,
            variety: record.variety,
            min_price: record.min_price,
            max_price: record.max_price,
            modal_price: record.modal_price
        }));

        res.render('marketDetails', { state, commodity, market, records, graphData });
    } catch (error) {
        console.error(`Error fetching records for market ${market} under commodity ${commodity} in state ${state}:`, error.message);
        res.status(500).send('Server Error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
