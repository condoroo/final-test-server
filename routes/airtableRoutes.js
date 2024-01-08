// Import the express module and create a router object
const express = require("express");
const router = express.Router();

// Import axios, a promise-based HTTP client, for making requests
const { default: axios } = require("axios");

// Retrieve Airtable API configuration from environment variables
const AIRTABLE_API_KEY = `${process.env.AIRTABLE_API_KEY}`;
const AIRTABLE_BASE_ID = `${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_TABLE_NAME = `${process.env.AIRTABLE_TABLE_NAME}`;

// Define a GET route '/get-records' to handle client requests for Airtable records
router.get("/get-records", async (req, res) => {
  try {
    // Construct the Airtable endpoint URL using the base ID and table name
    const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    // Perform a GET request to the Airtable API
    const response = await axios.get(airtableURL, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`, // Include the Airtable API key in the request header for authentication
      },
    });
    // Extract the records from the Airtable response
    const records = response.data.records;

    // Find a specific record by its ID, 'recvbfR2l1O0zQxVT'
    const specificRecord = records.find(
      (record) => record.id === "recvbfR2l1O0zQxVT"
    );

    // Send the specific record as the response to the client
    res.send(specificRecord);
  } catch (error) {
    // Log any errors that occur during the fetching of records
    console.error("Error fetching Airtable records:", error);
    // Respond with a 500 Internal Server Error status code and an error message
    res.status(500).json({ error: "Unable to fetch records" });
  }
});

// Export the router for use in other parts of the application
module.exports = router;
