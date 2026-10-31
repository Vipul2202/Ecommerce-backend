const mongoose = require('mongoose')
const seedServicePrices = require('../utils/seedServicePrices')

module.exports = () => {

  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
      await seedServicePrices();
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
    }
  };

  connect()

  mongoose.connection.on('error', console.log)
  mongoose.connection.on('disconnected', connect)
}