// Import required modules
const express = require('express');
const cors = require('cors');

// Create an Express app
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
require('dotenv').config();

// Webhooks must be used before express.json() parsing the data
const stripeWebhookRoutes = require('./routes/webhookStripeRoutes');
app.use(stripeWebhookRoutes);

/////////////-----------------
app.use(express.json());
// Define a sample route
app.get('/', (req, res) => {
    res.json({ message: 'server is running' });
});

const stripeRoutes = require('./routes/stripeRoutes');
const airtableRoutes = require('./routes/airtableRoutes');
const driveRoutes = require('./routes/driveRoutes');
const invoiceRoutes = require('./routes/phcInvoiceRoutes');

app.use(stripeRoutes);
app.use(airtableRoutes);
app.use(driveRoutes);
app.use(invoiceRoutes);


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
