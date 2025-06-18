const express = require('express');
const mongoose = require("mongoose");
const app = express();
const PORT = 3000;

app.use(express.json());
//database connection..
mongoose
  .connect("mongodb://127.0.0.1:27017/table")
  .then(() => { console.log("Connection successful") })
  .catch((err) => { console.log("Error", err) });
//similar to sequlize..
const bookingSchema = new mongoose.Schema({
  No_of_bookings: {
    type: Number,
    required: true
  } 
});

const Booking = mongoose.model('Booking', bookingSchema);

app.post('/bookings', async (req, res) => {
  try {
    const { bookings } = req.body;
    const newBooking = await Booking.create({ No_of_bookings: bookings });
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
 });
//sum of bookings..(aggregation)
app.get('/bookings/sum', async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: "$No_of_bookings" } } }
    ]);
    const total = result[0]?.total || 0;
    res.json({ totalBookings: total });
  } catch (error) {
    console.error('Error calculating sum:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//Average of bookings..
app.get('/bookings/avg', async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $group: { _id: null, average: { $avg: "$No_of_bookings" } } }
    ]);
    const average = result[0]?.average || 0;
    res.json({ averageBookings: average });
  } catch (error) {
    console.error('Error calculating sum:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});