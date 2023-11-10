// Import required modules
const express = require('express');
const cors = require('cors');
const { default: axios } = require('axios');
// Create an Express app
const app = express();
const port = 3000;

//airTable api keys
// Replace with your Airtable API key and base ID
const AIRTABLE_API_KEY = 'patuzRRxeWLfrvmpv.410ced9c8d8678a66f37f90a2a29bbe35cefdcadd460535ae43c9e297b7b2fe1';
const AIRTABLE_BASE_ID = 'appBwIpTiua9aUx8h';
const AIRTABLE_TABLE_NAME = 'Leads tracker';
//////////////////




// Enable CORS for all routes
app.use(cors());

//webhook event handlers
// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_wYPIGf3wJiJXm8B1H4UzALaQ35jTbIC9";
const stripe = require('stripe')(`sk_test_51M5vv4CLTcmkmHRYZkWtQyNXEjCP43tttOJZXjfQz5PoCOpXZK6cuZOtKR91YWnidNeWZasoQVI9DUxdmkg5nliB00Nh97yLKB`);
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
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
            const recordId = customerCreated.metadata.recordId;

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
    const { userName, userEmail, unitPrice, interval, productName, secretKey, currency, reDirectUrl, imageUrl, recordId, billing_cycle_anchor } = req.body;
    console.log(typeof (unitPrice))
    const stripe = require('stripe')(`${secretKey}`);

    // Split the date string into month, day, and year
    const [month, day, year] = billing_cycle_anchor.split('/');

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
            billing_cycle_anchor: unixTimestamp,
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

        const specificRecord = records.find(record => record.id === 'recbdDOaHbwUgDZgO');

        if (specificRecord) {
            // If found, return the specific record
            res.json(specificRecord);
        } else {
            res.status(404).json({ error: 'Record not found' });
        }

    } catch (error) {
        console.error('Error fetching Airtable records:', error);
        res.status(500).json({ error: 'Unable to fetch records' });
    }
});

//


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
