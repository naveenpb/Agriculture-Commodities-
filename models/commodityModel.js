const mongoose = require('mongoose');

// Define Schema for commodity prices
const priceSchema = new mongoose.Schema({
    state: { 
        type: String, 
        required: true, 
        index: true, 
    }, // State name

    commodities: [{
        commodity: { 
            type: String, 
            required: true, 
            index: true 
        }, // Commodity name

        markets: [{
            market: { 
                type: String, 
                required: true 
            }, // Market name

            records: [{
                arrival_date: { 
                    type: Date, 
                    required: true 
                }, // Arrival date of the price

                district: { 
                    type: String, 
                    required: true 
                }, // District name

                variety: { 
                    type: String, 
                    default: 'Unknown' 
                }, // Variety of commodity, default if not provided

                grade: { 
                    type: String, 
                    default: 'Standard' 
                }, // Grade of commodity, default value

                min_price: { 
                    type: Number, 
                    required: true 
                }, // Minimum price, numeric type

                max_price: { 
                    type: Number, 
                    required: true 
                }, // Maximum price, numeric type

                modal_price: { 
                    type: Number, 
                    required: true 
                } // Modal price, numeric type
            }]
        }]
    }]
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// Create an index for records.arrival_date for efficient date-based queries
priceSchema.index({ 'commodities.markets.records.arrival_date': 1 });

// Create and export model
const Price = mongoose.model('Price', priceSchema);
module.exports = Price;
