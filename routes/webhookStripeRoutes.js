// Importing necessary modules
const express = require("express");
const router = express.Router();
const { default: axios } = require("axios");
// Stripe module for payment processing
const stripe = require("stripe")(`${process.env.STRIPE_SK}`);

// Environment variables for Airtable API key, Base ID, Table Name, and Stripe secret key
const AIRTABLE_API_KEY = `${process.env.AIRTABLE_API_KEY}`;
const AIRTABLE_BASE_ID = `${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_TABLE_NAME = `${process.env.AIRTABLE_TABLE_NAME}`;
const endpointSecret = `${process.env.WEB_HOOK_SECRET_KEY}`;

/**
 * Converts a Unix timestamp to a human-readable date and time string.
 * @param {number} unixTimestamp - The Unix timestamp to convert.
 * @returns {string} - The formatted date and time string.
 */
function convertUnixTimestampToDate(unixTimestamp) {
  // Create a new Date object from the Unix timestamp
  const date = new Date(unixTimestamp * 1000);
  // Format date components, adding leading zeros where necessary
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  // Convert 24-hour time to 12-hour format with AM/PM
  let hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  // Construct the formatted date and time string
  const formattedDateTime = `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
  return formattedDateTime;
}

// Define a POST endpoint to handle Stripe webhook events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"]; // Retrieve the Stripe signature from the request headers

    let event; // Variable to hold the Stripe event

    // Attempt to construct the event using the Stripe library method
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      // Respond with an error if event construction fails
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle different types of Stripe events
    switch (event.type) {
      case "checkout.session.async_payment_failed":
        // Handle failed asynchronous payment at checkout
        const checkoutSessionAsyncPaymentFailed = event.data.object;
        break;
      case "checkout.session.async_payment_succeeded":
        const checkoutSessionAsyncPaymentSucceeded = event.data.object;
        break;
      case "checkout.session.completed":
        const checkoutSessionCompleted = event.data.object;
        break;
      case "checkout.session.expired":
        const checkoutSessionExpired = event.data.object;
        break;
      case "customer.created":
        // Handle a new customer being created
        const customerCreated = event.data.object;
        const recordId = customerCreated.metadata.recordId;
        console.log("This is recordId: ", recordId);
        try {
          // Construct the Airtable API URL for a specific record ID
          const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
          // Data to update in Airtable
          const updateData = {
            fields: {
              "Customer ID (for stripe)": customerCreated.id,
              "Customer created date (for stripe)": convertUnixTimestampToDate(
                customerCreated.created
              ),
            },
          };

          // Perform a PATCH request to update the Airtable record
          await axios.patch(airtableURL, updateData, {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            },
          });
        } catch (error) {
          // Log the error if the Airtable update fails
          console.log(error);
        }
        break;
      case "customer.deleted":
        const customerDeleted = event.data.object;
        break;
      case "customer.updated":
        const customerUpdated = event.data.object;
        break;
      // Handling the 'customer.subscription.created' event from Stripe webhooks
      case "customer.subscription.created":
        // Retrieve the subscription object from the event data
        const customerSubscriptionCreated = event.data.object;
        // Extract relevant information from the subscription object
        const subscriptionId = customerSubscriptionCreated.id;
        const customer = customerSubscriptionCreated.customer;

        try {
          // Construct the URL to the Airtable API for the table of interest
          const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
          // Make a GET request to Airtable to fetch all records
          const response = await axios.get(airtableURL2, {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            },
          });

          // Extract records from the Airtable response
          const records = response.data.records;

          // Find the record in Airtable that matches the Stripe customer ID
          const matchingRecord = records.find((record) => {
            const customerIdFieldValue =
              record.fields["Customer ID (for stripe)"];
            return customerIdFieldValue === customer;
          });

          // If a matching record is found, update it with the new subscription information
          if (matchingRecord) {
            try {
              const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
              const updateData = {
                fields: {
                  "Subscription ID (for stripe)": subscriptionId,
                  "Subscription created date (for stripe)":
                    convertUnixTimestampToDate(
                      customerSubscriptionCreated.created
                    ),
                  "Default payment method (for stripe)":
                    customerSubscriptionCreated.default_payment_method,
                },
              };

              // Make a PATCH request to update the specific record in Airtable
              await axios.patch(airtableURL, updateData, {
                headers: {
                  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
              });
            } catch (error) {
              // Log any errors that occur during the update process
              console.error(
                "Error updating subscription:",
                error.response ? error.response.data : error.message
              );
            }
          }
        } catch (error) {
          // Handle errors that occur during the GET request to Airtable
        }

        break;
      // Handling the 'payment_intent.succeeded' event from Stripe webhooks
      case "payment_intent.succeeded":
        // Retrieve the payment intent object from the event data
        const paymentIntentSucceed = event.data.object;

        // Empty console.log, likely left over from debugging; should be removed
        console.log();
        // Extract the customer ID from the payment intent
        const customerId = paymentIntentSucceed.customer;

        try {
          // Construct the URL for the Airtable API to access the desired table
          const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
          // Make a GET request to Airtable to retrieve all records
          const response = await axios.get(airtableURL2, {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`, // Use the Airtable API key for authorization
            },
          });

          // Store the retrieved records from Airtable
          const records = response.data.records;
          // Log the records, likely for debugging purposes
          console.log({ records });

          // Find the record in Airtable that matches the Stripe customer ID
          const matchingRecord = records.find((record) => {
            const customerIdFieldValue =
              record.fields["Customer ID (for stripe)"];
            return customerIdFieldValue === customerId;
          });

          // Log the found record, again for debugging
          console.log({ matchingRecord });

          // If a matching record is found, proceed with updating it
          if (matchingRecord) {
            // Calculate the previous debt by adding the remaining amount to the payment amount
            let previousDebt =
              (paymentIntentSucceed.amount_remaining +
                paymentIntentSucceed.amount) /
              100;
            // Retrieve any existing balance history from the matching record
            let existingBalanceHistory =
              matchingRecord.fields["Balance history (for automation)"];

            // Create a new balance history entry with a formatted date and payment details
            let newBalanceHistoryEntry = `Dia ${convertUnixTimestampToDate(
              paymentIntentSucceed.created
            )}
      \n- Novo pagamento de quota = ${paymentIntentSucceed.amount / 100}€
      \n- Quotas em dívida = ${
        paymentIntentSucceed.amount_remaining / 100
      }€ = ${previousDebt}€ (quotas em dívida anteriores) - ${
              paymentIntentSucceed.amount / 100
            }€ (novo pagamento de quota)\n`;

            // Concatenate the new entry with the existing balance history
            let updatedBalanceHistory =
              newBalanceHistoryEntry + (existingBalanceHistory || "");

            try {
              // Construct the URL for updating the specific Airtable record
              const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
              // Create the data payload for the update
              const updateData = {
                fields: {
                  "Last successful payment date (for stripe)":
                    convertUnixTimestampToDate(paymentIntentSucceed.created),
                  "Last successful payment ID (for stripe)":
                    paymentIntentSucceed.id,
                  "Last successful payment amount (for stripe)":
                    paymentIntentSucceed.amount / 100,
                  "Last successful payment method (for stripe)":
                    paymentIntentSucceed.payment_method,
                  "Last outstanding balance (for stripe)":
                    paymentIntentSucceed.amount_remaining / 100,
                  "Balance history (for automation)": updatedBalanceHistory,
                },
              };

              // Make a PATCH request to update the Airtable record with the new data
              const updateResponse = await axios.patch(
                airtableURL,
                updateData,
                {
                  headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                  },
                }
              );

              // Log the response from the Airtable API
              console.log("Airtable API Response:", updateResponse.data);
              console.log("Reached the end successfully");
            } catch (error) {
              // Log any errors that occur during the Airtable update process
              console.error(
                "Error updating Airtable:",
                error.response ? error.response.data : error.message
              );
            }
          } else {
            // If no matching record is found, you might want to handle this case
          }
        } catch (error) {
          // Handle errors that occur during the initial GET request to Airtable
        }

        break;
      // Handling the 'invoice.payment_failed' event from Stripe webhooks
      case "invoice.payment_failed":
        // Retrieve the invoice object from the event data
        const customerInvoiceFailed = event.data.object;
        // Extract the customer ID and convert the Unix timestamp to a readable date
        const customerID = customerInvoiceFailed.customer;
        const failedDate = convertUnixTimestampToDate(
          customerInvoiceFailed.created
        );

        try {
          // Construct the URL for the Airtable API to access the table
          const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
          // Make a GET request to Airtable to retrieve all records
          const response = await axios.get(airtableURL2, {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`, // Use the Airtable API key for authorization
            },
          });

          // Store the retrieved records from Airtable
          const records = response.data.records;
          // Log the records, likely for debugging purposes
          console.log({ records });

          // Find the record in Airtable that matches the Stripe customer ID
          const matchingRecord = records.find((record) => {
            const customerIdFieldValue =
              record.fields["Customer ID (for stripe)"];
            return customerIdFieldValue === customerID;
          });

          // Log the found record, again for debugging
          console.log({ matchingRecord });

          // If a matching record is found, update it with the failed payment details
          if (matchingRecord) {
            try {
              // Construct the URL for updating the specific Airtable record
              const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
              // Create the data payload for the update
              const updateData = {
                fields: {
                  "Last failed payment date (for stripe)": failedDate,
                  "Last failed payment ID (for stripe)":
                    customerInvoiceFailed.id,
                  "Last failed payment amount (for stripe)":
                    customerInvoiceFailed.amount_remaining / 100,
                  "Last outstanding balance (for stripe)":
                    customerInvoiceFailed.amount_remaining / 100,
                },
              };

              // Log the URL and data for debugging
              console.log("Airtable URL:", airtableURL);
              console.log("Update Data:", updateData);

              // Make a PATCH request to Airtable to update the record with the new data
              const updateResponse = await axios.patch(
                airtableURL,
                updateData,
                {
                  headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                  },
                }
              );

              // Log the response from Airtable
              console.log("Airtable API Response:", updateResponse.data);
              console.log("Reached the end successfully");
            } catch (error) {
              // Log any errors that occur during the update process
              console.error(
                "Error updating Airtable:",
                error.response ? error.response.data : error.message
              );
            }
          } else {
            // If no matching record is found, you might want to handle this case
          }
        } catch (error) {
          // Handle errors that occur during the GET request to Airtable
        }

        break;
      // Handling the 'invoice.payment_succeeded' event from Stripe webhooks
      case "invoice.payment_succeeded":
        // Extracting the payment intent object from the Stripe event data
        const invoicePaymentIntentSucceed = event.data.object;
        // Extracting the customer ID from the payment intent
        const customerid = invoicePaymentIntentSucceed.customer;
        // Converting the Unix timestamp to a human-readable date format
        const successDate = convertUnixTimestampToDate(
          invoicePaymentIntentSucceed.created
        );

        try {
          // Defining the Airtable API endpoint to fetch records from the specified base and table
          const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
          // Making a GET request to Airtable to retrieve all records in the table
          const response = await axios.get(airtableURL2, {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`, // Using the Airtable API key for authentication
            },
          });

          // Storing the retrieved records from the Airtable response
          const records = response.data.records;
          // Logging the records for debugging purposes
          console.log({ records });

          // Finding the Airtable record that matches the Stripe customer ID
          const matchingRecord = records.find((record) => {
            const customerIdFieldValue =
              record.fields["Customer ID (for stripe)"];
            return customerIdFieldValue === customerid;
          });

          // Logging the matching record for debugging purposes
          console.log({ matchingRecord });

          // If a matching record is found, proceed to update it with the new information
          if (matchingRecord) {
            // Retrieve any existing payment receipt URLs from the matching record
            const existingData =
              matchingRecord.fields[
                "Last successful payment receipt URL (for stripe)"
              ] || "";
            // Get the new payment receipt URL from the Stripe payment intent object
            const newDataValue = invoicePaymentIntentSucceed.hosted_invoice_url;
            // Construct a new entry for the payment history
            const newData = `Pagamento efetuado em: ${convertUnixTimestampToDate(
              invoicePaymentIntentSucceed.status_transitions.paid_at
            )} ${newDataValue} \n\n ${existingData}`;
            // This new entry includes the payment date and receipt URL along with any existing payment history

            try {
              // Construct the URL for updating the specific Airtable record
              const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
              // Prepare the data payload with the updated payment information
              const updateData = {
                fields: {
                  "Last outstanding balance (for stripe)":
                    invoicePaymentIntentSucceed.amount_remaining / 100,
                  "Last successful payment receipt URL (for stripe)": newData,
                  "Last successful payment date (for stripe)":
                    convertUnixTimestampToDate(
                      invoicePaymentIntentSucceed.status_transitions.paid_at
                    ),
                },
              };

              // Log the URL and data payload for debugging purposes
              console.log("Airtable URL:", airtableURL);
              console.log("Update Data:", updateData);

              // Make a PATCH request to Airtable to update the record with the new data
              const updateResponse = await axios.patch(
                airtableURL,
                updateData,
                {
                  headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                  },
                }
              );

              // Log the response from Airtable for confirmation
              console.log("Airtable API Response:", updateResponse.data);
              console.log("Reached the end successfully");
            } catch (error) {
              // Log any errors that occur during the update process
              console.error(
                "Error updating Airtable:",
                error.response ? error.response.data : error.message
              );
            }
          } else {
            // If no matching record is found, additional logic can be implemented here
            // For example, creating a new record or alerting an administrator
          }
        } catch (error) {
          // Catching and handling any errors that occur during the GET request to Airtable
          console.error(
            "Error fetching records from Airtable:",
            error.response ? error.response.data : error.message
          );
        }

        break;
      case "customer.subscription.pending_update_applied":
        const customerSubscriptionPendingUpdateApplied = event.data.object;
        break;
      case "customer.subscription.pending_update_expired":
        const customerSubscriptionPendingUpdateExpired = event.data.object;
        break;
      case "customer.subscription.resumed":
        const customerSubscriptionResumed = event.data.object;
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    response.status(200).send("Webhook received and processed successfully");
  }
);

module.exports = router;
