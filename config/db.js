require('dotenv').config();  // Ensure dotenv is loaded at the top of the file
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;  // Use the connection string from the .env file

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
