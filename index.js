// Import required modules
const express = require('express');
const cors = require('cors');
const { default: axios } = require('axios');
// Create an Express app
const app = express();
const port = 3000;


//////////////////functions

function convertUnixTimestampToDate(unixTimestamp) {
    // Create a new Date object with the Unix timestamp in milliseconds
    const dateObject = new Date(unixTimestamp * 1000);

    // Extract the components (month, day, year) from the date object
    const month = dateObject.getMonth() + 1; // Months are zero-based, so add 1
    const day = dateObject.getDate();
    const year = dateObject.getFullYear();

    // Format the date as month/date/year
    const formattedDate = `${month}/${day}/${year}`;

    return formattedDate;
}

////


// Enable CORS for all routes
app.use(cors());
require('dotenv').config();

//webhook event handlers
// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = `${process.env.WEB_HOOK_SECRET_KEY}`;
const stripe = require('stripe')(`${process.env.STRIPE_SK}`);

//airTable api keys
// Replace with your Airtable API key and base ID
const AIRTABLE_API_KEY = `${process.env.AIRTABLE_API_KEY}`;
const AIRTABLE_BASE_ID = `${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_TABLE_NAME = `${process.env.AIRTABLE_TABLE_NAME}`;


app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.async_payment_failed':
            const checkoutSessionAsyncPaymentFailed = event.data.object;
            // Then define and call a function to handle the event checkout.session.async_payment_failed

            break;
        case 'checkout.session.async_payment_succeeded':
            const checkoutSessionAsyncPaymentSucceeded = event.data.object;
            // Then define and call a function to handle the event checkout.session.async_payment_succeeded
            break;
        case 'checkout.session.completed':
            const checkoutSessionCompleted = event.data.object;
            // Then define and call a function to handle the event checkout.session.completed
            break;
        case 'checkout.session.expired':
            const checkoutSessionExpired = event.data.object;
            // Then define and call a function to handle the event checkout.session.expired
            break;
        case 'customer.created':
            const customerCreated = event.data.object;
            // Then define and call a function to handle the event customer.created
            //-
            const recordId = customerCreated.metadata.recordId;
            //--
            console.log('This is recordId: ', recordId);
            // const recordId = 'recbdDOaHbwUgDZgO';
            //update record
            try {
                const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
                const updateData = {
                    fields: {
                        "Customer ID (for stripe)": customerCreated.id,
                        "Customer created date (for stripe)": convertUnixTimestampToDate(customerCreated.created),
                    },
                };

                await axios.patch(airtableURL, updateData, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });
                // res.json(specificRecord);

            } catch (error) {
                // res.send(error);
                console.log(error);
            }
            // end update record

            break;
        case 'customer.deleted':
            const customerDeleted = event.data.object;
            // Then define and call a function to handle the event customer.deleted
            break;
        case 'customer.updated':
            const customerUpdated = event.data.object;
            // Then define and call a function to handle the event customer.updated
            break;
        case 'customer.subscription.created':
            const customerSubscriptionCreated = event.data.object;
            // Then define and call a function to handle the event customer.subscription.created
            const subscriptionId = customerSubscriptionCreated.id;
            const customer = customerSubscriptionCreated.customer;

            //get record id based on customerId
            try {
                const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
                const response = await axios.get(airtableURL2, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });

                const records = response.data.records;

                // Find the record that matches the provided "Customer ID (for stripe)" value
                const matchingRecord = records.find(record => {
                    const customerIdFieldValue = record.fields["Customer ID (for stripe)"];
                    return customerIdFieldValue === customer;
                });



                if (matchingRecord) {

                    try {
                        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
                        const updateData = {
                            fields: {
                                "Subscription ID (for stripe)": subscriptionId,
                                "Subscription created date (for stripe)": convertUnixTimestampToDate(customerSubscriptionCreated.created),
                                "Default payment method (for stripe)": customerSubscriptionCreated.default_payment_method,
                            },
                        };

                        await axios.patch(airtableURL, updateData, {
                            headers: {
                                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                            },
                        });

                    } catch (error) {
                        console.error('Error updating subscription:', error.response ? error.response.data : error.message);
                    }


                } else {

                }
            } catch (error) {

            }

            break;
        case 'payment_intent.succeeded':
            const paymentIntentSucceed = event.data.object;

            // Then define and call a function to handle the event customer.subscription.created
            console.log()
            const customerId = paymentIntentSucceed.customer;


            //get record id based on customerId
            try {
                const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
                const response = await axios.get(airtableURL2, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });

                const records = response.data.records;
                console.log({
                    records
                })
                // Find the record that matches the provided "Customer ID (for stripe)" value
                const matchingRecord = records.find(record => {
                    const customerIdFieldValue = record.fields["Customer ID (for stripe)"];
                    return customerIdFieldValue === customerId;
                });

                console.log({
                    matchingRecord
                })

                if (matchingRecord) {

                    try {
                        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
                        const updateData = {
                            fields: {
                                "Last succesful payment date (for stripe)": convertUnixTimestampToDate(paymentIntentSucceed.created),
                                "Last sucessful payment ID (for stipe)": paymentIntentSucceed.id,
                                "Last sucessful payment amount (for stipe)": paymentIntentSucceed.amount,
                                "Last sucessful payment method (for stipe)": paymentIntentSucceed.payment_method,
                                "Last sucessful payment charges (for stipe)": paymentIntentSucceed.amount,

                            },
                        };

                        console.log('Airtable URL:', airtableURL);
                        console.log('Update Data:', updateData);

                        const response = await axios.patch(airtableURL, updateData, {
                            headers: {
                                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                            },
                        });

                        console.log('Airtable API Response:', response.data);
                        console.log('Reached the end successfully');
                    } catch (error) {
                        console.error('Error updating Airtable:', error.response ? error.response.data : error.message);
                    }


                } else {

                }
            } catch (error) {

            }


            break;
        case 'customer.subscription.deleted':
            const customerSubscriptionDeleted = event.data.object;
            // Then define and call a function to handle the event customer.subscription.deleted
            break;
        case 'customer.subscription.paused':
            const customerSubscriptionPaused = event.data.object;
            // Then define and call a function to handle the event customer.subscription.paused
            break;
        case 'customer.subscription.pending_update_applied':
            const customerSubscriptionPendingUpdateApplied = event.data.object;
            // Then define and call a function to handle the event customer.subscription.pending_update_applied
            break;
        case 'customer.subscription.pending_update_expired':
            const customerSubscriptionPendingUpdateExpired = event.data.object;
            // Then define and call a function to handle the event customer.subscription.pending_update_expired
            break;
        case 'customer.subscription.resumed':
            const customerSubscriptionResumed = event.data.object;
            // Then define and call a function to handle the event customer.subscription.resumed
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});





/////////////-----------------
app.use(express.json());
// Define a sample route
app.get('/', (req, res) => {
    res.json({ message: 'server is running' });
});

app.post('/create-subscription', async (req, res) => {
    const {
        userName,
        userEmail,
        unitPrice,
        interval,
        productName,
        secretKey,
        currency,
        reDirectUrl,
        imageUrl,
        recordId,
        billing_cycle_anchor,

    } = req.body;
    console.log(typeof (unitPrice))


    // Split the date string into month, day, and year
    const [month, day, year] = billing_cycle_anchor?.split('/');

    // Create a new Date object with the specified year, month (zero-based), and day
    const dateObject = new Date(year, month - 1, day);

    // Get the UNIX timestamp in seconds
    const unixTimestamp = Math.floor(dateObject.getTime() / 1000);


    try {
        // Step 1: Create a customer
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
                recordId: recordId,
                userName: userName,
            }
        });

        // Step 2: Create a product and a price
        const product = await stripe.products.create({
            name: productName,
            type: 'service', // You can adjust this based on your product type
        });

        // Attach the image to the product
        await stripe.products.update(product.id, {
            images: [imageUrl],
        });

        const priceData = {
            product: product.id,
            unit_amount: Math.floor(unitPrice * 1000) / 1000 * 100, // Price in cents (multiply by 100)
            currency: currency, // You can adjust the currency
        };

        if (interval) {
            priceData.recurring = { interval: interval };
        }

        // Define the 'price' variable before using it
        const price = await stripe.prices.create(priceData);


        // Step 3: Create a checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            metadata: {
                recordId: recordId, // Add metadata to the session
                userName: userName,
            },
            mode: 'subscription',
            subscription_data: {
                billing_cycle_anchor: unixTimestamp
            },
            success_url: `${reDirectUrl}`,
            cancel_url: `${reDirectUrl}`,

        });

        res.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


//AirTable test api

app.get('/get-records', async (req, res) => {
    try {
        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        const response = await axios.get(airtableURL, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            },
        });
        const records = response.data.records;

        const specificRecord = records.find(record => record.id === 'recrigpxBo30dyrjg');

        const recordId = specificRecord.id;
        //--

        // const recordId = 'recbdDOaHbwUgDZgO';
        //update record
        try {
            const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
            const updateData = {
                fields: {
                    "Customer ID (for stripe)": 'Updated data',
                    "Customer created date (for stripe)": 'updated data',
                },
            };

            await axios.patch(airtableURL, updateData, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            });
            res.json(specificRecord);

        } catch (error) {
            res.send(error);
        }
        // end update record

        // res.send(specificRecord);

    } catch (error) {
        console.error('Error fetching Airtable records:', error);
        res.status(500).json({ error: 'Unable to fetch records' });
    }
});

app.get('/tes', async (req, res) => {
    const customerId = 'cus_Oytq0OxWH6dz8Y';


});

//


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
