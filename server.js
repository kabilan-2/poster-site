const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/wallposters');

// Define schema
const shippingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  country: String,
  address: String,
  city: String,
  state: String,
  postal: String,
});

const Shipping = mongoose.model('Shipping', shippingSchema);

// Route to store shipping details
app.post('/api/shipping', async (req, res) => {
  try {
    const shipping = new Shipping(req.body);
    await shipping.save();
    res.status(200).send({ message: 'Shipping details saved successfully' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to save shipping details' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));