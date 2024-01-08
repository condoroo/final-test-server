// Import the Express framework and create an application instance
const express = require("express");
const app = express();

// Import the CORS package to allow cross-origin requests
const cors = require("cors");

// The port number the server will listen on
const port = 3000;

// Enable CORS for all routes, allowing access from any domain
app.use(cors());

// Load environment variables from a .env file into process.env
require("dotenv").config();

// Import routes for handling Stripe webhooks and attach them to the Express app
const stripeWebhookRoutes = require("./routes/webhookStripeRoutes");
app.use(stripeWebhookRoutes);

// Built-in middleware for parsing incoming requests with JSON payloads
app.use(express.json());

// Define a GET route for the root path which responds with a JSON object
app.get("/", (req, res) => {
  res.json({ message: "server is running" });
});

// Import routes from different modules and attach them to the Express app
const stripeRoutes = require("./routes/stripeRoutes");
const airtableRoutes = require("./routes/airtableRoutes");
const driveRoutes = require("./routes/driveRoutes");
const invoiceRoutes = require("./routes/phcInvoiceRoutes");

// Attach imported routes to the Express app instance
app.use(stripeRoutes);
app.use(airtableRoutes);
app.use(driveRoutes);
app.use(invoiceRoutes);

// Start the server and listen for requests on the defined port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
