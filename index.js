// Import required modules
const express = require('express');
const cors = require('cors');
// Create an Express app
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
// Define a sample route
app.get('/', (req, res) => {
    res.json({ message: 'server is running' });
});

app.post('/create-subscription', async (req, res) => {
    const { userName, userEmail, unitPrice, interval, productName, secretKey } = req.body;
    console.log(typeof (unitPrice))
    const stripe = require('stripe')(`${secretKey}`);

    try {
        // Step 1: Create a customer
        const customer = await stripe.customers.create({
            email: userEmail,
        });

        // Step 2: Create a product and a price
        const product = await stripe.products.create({
            name: productName,
            type: 'service', // You can adjust this based on your product type
        });

        const priceData = {
            product: product.id,
            unit_amount: Math.floor(unitPrice * 1000) / 1000 * 100, // Price in cents (multiply by 100)
            currency: 'usd', // You can adjust the currency
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
            meta_data: [

            ],
            mode: 'subscription',
            success_url: 'https://your-success-url.com',
            cancel_url: 'https://your-cancel-url.com',
        });

        res.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
