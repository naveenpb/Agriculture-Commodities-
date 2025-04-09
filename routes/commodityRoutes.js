const express = require('express');
const router = express.Router();
const commodityController = require('../controllers/commodityController');

// Route to manually update commodity data (fetching data from API and saving it)
router.post('/update-commodity-data', commodityController.updateCommodityData);

// You can also add additional routes for other functionalities if required
// Example: Get the data of a particular commodity, market, etc.
// router.get('/commodity/:commodity/:market', commodityController.getCommodityData);

module.exports = router;
