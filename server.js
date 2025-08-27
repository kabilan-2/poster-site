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
const orderSchema = new mongoose.Schema({
  shipping: {
    name: String,
    phone: String,
    email: String,
    country: String,
    address: String,
    city: String,
    state: String,
    postal: String,
  },
  items: [
    {
      title: String,
      size: String,
      qty: Number,
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Store order + shipping details
app.post('/api/order', async (req, res) => {
  try {
    const { shipping, items } = req.body;
    const order = new Order({ shipping, items });
    await order.save();
    res.status(200).send({ message: 'Order saved successfully', orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Failed to save order' });
  }
});


app.listen(3000, () => console.log('Server running on port 3000'));
