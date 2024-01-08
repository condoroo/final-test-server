const express = require("express");
const router = express.Router();
const { default: axios } = require("axios");

// Endpoint paths for generating an access token, creating a document & creating a customer
const createCustomerEndpoint = "/createCustomer";
const generateAccessTokenEndpoint = "/generateAccessToken";
const createDocumentEndpoint = "/createDocument";

/**
 * Route handler to create a customer.
 * Expects body to have name, email, tax_number, observations, backendUrl, appId, userCode,
 * password, company, tokenLifeTime, API_URL.
 * @param {object} req - The request object from the client.
 * @param {object} res - The response object to send the data back to the client.
 */
router.post("/createCustomer", async (req, res) => {
  // Extract the body parameters sent with the request
  const {
    name,
    email,
    tax_number,
    observations,
    backendUrl,
    appId,
    userCode,
    password,
    company,
    tokenLifeTime,
    API_URL,
  } = req.body;

  /**
   * Requests an access token from the API.
   * @returns {Promise<string>} The access token string.
   */
  async function requestAccessToken() {
    const url = API_URL + "/generateAccessToken";
    const credentials = {
      backendUrl,
      appId,
      userCode,
      password,
      company,
      tokenLifeTime,
    };

    try {
      // Log the credentials for debugging (might be sensitive - ensure logging is secure)
      console.log("Requesting access token with credentials:", credentials);
      // Make a post request to the API to get an access token
      const response = await axios.post(url, { credentials });
      // Log the response for debugging
      console.log("Access token response:", response);

      // Check if the API responded with an error code
      if (response.data.code === 100) {
        console.error("Error in login:", response.data.message);
        throw new Error("Error in login. Please verify your credentials.");
      }

      // Return the access token from the response
      return response.data.token;
    } catch (error) {
      console.error(
        "Error in access token request:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Creates a customer using the provided token and customer data.
   * @param {string} token - The access token for API authorization.
   * @param {object} customerData - The customer data to be sent to the API.
   * @returns {Promise<object>} The response data from the API.
   */
  async function createCustomer(token, customerData) {
    const url = API_URL + createCustomerEndpoint;

    try {
      console.log("Creating customer with token:", token);
      console.log("Customer data:", customerData);

      // Make a post request to create the customer with the given data
      const response = await axios.post(url, customerData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      console.log("Create customer response:", response.data);

      // Check if the API responded with an error code
      if (response.data.code === 100) {
        throw new Error("Error creating customer. Server returned code 100.");
      }

      // Return the API response
      return response.data;
    } catch (error) {
      console.error(
        "Error creating customer:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Try to get an access token, create a customer, and send back the API response
  try {
    const accessToken = await requestAccessToken();
    console.log("Access Token Generated Successfully!");

    // Set up the customer data structure
    const customerData = {
      customer: {
        name: name,
        address: "",
        postalCode: "",
        city: "",
        country: "Pt",
        email: email,
        taxNumber: tax_number,
        phone: "",
        mobilePhone: "",
        iban: "",
        bic: "",
        observations: observations,
      },
    };

    // Create the customer using the access token and customer data
    const customerCreationData = await createCustomer(
      accessToken,
      customerData
    );

    // Send back the successful response from the API
    res.json(customerCreationData);
  } catch (error) {
    // Log the error and send a 500 Internal Server Error response
    console.error(error);
    res.status(500).json({ code: 100, message: "Internal Server Error" });
  }
});

// POST route handler for creating an invoice
router.post("/createInvoice", async (req, res) => {
  // Destructure and assign variables from the request body
  const {
    name,
    email,
    tax_number,
    observations,
    backendUrl,
    appId,
    userCode,
    password,
    company,
    tokenLifeTime,
    API_URL,
    designation,
    unitPrice,
    number,
  } = req.body;

  // Log the tax number for debugging
  console.log("this is tax number", tax_number);

  // Function to request an access token from the remote API
  async function requestAccessToken() {
    // Construct the full URL for the token generation endpoint
    const url = API_URL + generateAccessTokenEndpoint;

    // Package credentials for the token request
    const credentials = {
      backendUrl,
      appId,
      userCode,
      password,
      company,
      tokenLifeTime,
    };

    try {
      // Make a POST request to the API to get an access token
      const response = await axios.post(url, { credentials });

      // Log various parts of the response for debugging
      console.log("Access token response (headers):", response.headers);
      console.log("Access token response (status):", response.status);
      console.log("Access token response (data):", response.data);

      // Check if the response contains an error code and throw an error if so
      if (response.data.code === 100) {
        console.error("Error in login:", response.data.message);
        throw new Error("Error in login. Please verify your credentials.");
      }

      // Return the access token
      return response.data.token;
    } catch (error) {
      // Log any errors and rethrow them
      console.error(
        "Error in access token request:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Function to create a document (invoice) using the provided access token and data
  async function createDocument(token, documentData) {
    // Construct the URL for creating the document
    const url = API_URL + createDocumentEndpoint;

    try {
      // Make a POST request to the API to create the document with the access token in the header
      const response = await axios.post(url, documentData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      // Log the response for debugging
      console.log("Create document response:", response.data);

      // Check if the response contains an error code and throw an error if so
      if (response.data.code === 100) {
        console.error("Error creating document:", response.data.message);
        throw new Error("Error creating document");
      }

      // Return the response data
      return response.data;
    } catch (error) {
      // Log any errors and rethrow them
      console.error(
        "Error creating document:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  try {
    // Request an access token
    const accessToken = await requestAccessToken();
    console.log("Access Token Generated Successfully!");

    // Define the data structure for the document to be created
    const documentData = {
      customer: {
        number: number,
        name,
        taxNumber: `${tax_number}`,
      },
      requestOptions: {
        option: 1,
        requestedFields: [],
      },
      document: {
        docType: 1,
        invoicingAddress1: "",
        invoicingPostalCode: "",
        invoicingLocality: "",
        documentObservations: observations,
      },
      products: [
        {
          reference: "",
          designation: designation,
          unitCode: "M",
          unitPrice: unitPrice,
          quantity: 1,
          taxIncluded: true,
          taxPercentage: 23,
          taxRegion: "PT",
        },
      ],
    };

    // Create the document with the access token and document data
    const creationMessage = await createDocument(accessToken, documentData);
    console.log(creationMessage);

    // Send the response from the document creation back to the client
    res.json(creationMessage);
  } catch (error) {
    // Log any errors that occur during the process
    console.error(error);
    // Send a 500 Internal Server Error response back to the client
    res.status(500).json({ code: 100, message: "Internal Server Error" });
  }
});

// Export the router for use in other parts of the application
module.exports = router;
