const express = require('express');
const router = express.Router();

const stripe = require('stripe')(`${process.env.STRIPE_SK}`);

router.post('/create-subscription', async (req, res) => {
    const {
        userName,
        userEmail,
        unitPrice,
        interval,
        productName,
        currency,
        reDirectUrl,
        imageUrl,
        recordId,
        billing_cycle_anchor,
        trial_end,

    } = req.body;
    console.log(typeof (unitPrice))
    console.log('this is billing cycle anchor', billing_cycle_anchor);
    console.log('This is is unit price', unitPrice);

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
            unit_amount: Math.round(unitPrice * 100), // Price in cents (multiply by 100)
            currency: currency, // You can adjust the currency
        };

        if (interval) {
            priceData.recurring = { interval: interval };
        }

        // Define the 'price' variable before using it
        const price = await stripe.prices.create(priceData);

        // Prepare subscription data
        let subscription_data = {
            billing_cycle_anchor: unixTimestamp,
        };

        if (trial_end) {
            //subscription_data.trial_end = trial_end;
        }


        // Step 3: Create a checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card', 'sepa_debit'],
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
            subscription_data: subscription_data,
            success_url: `${reDirectUrl}`,
            cancel_url: `${reDirectUrl}`,

        });

        res.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

router.post('/create-connect-account', async (req, res) => {
    const { email,
        name,
        phone,
        tax_id,
        iban,
        account_number
    } = req.body;
    try {
        // Create a custom account for Portugal
        const account = await stripe.accounts.create({
            type: 'custom',
            country: 'PT',
            email: email, // Replace with the business email
            business_type: 'company', // 'individual' or 'company' depending on your use case
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            company: {
                name: name,
                address: {
                    line1: '',
                    city: '',
                    postal_code: '',
                    state: '',
                },
                phone: `${phone}`, // Replace with the actual phone number
                tax_id: `${tax_id}`, // Replace with the actual tax ID
                registration_number: `${Math.random(8)}`, // Replace with the actual registration number
                directors_provided: true,
            },
            tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: req.ip, // Use the client's IP or your server's IP


            },
            external_account: {
                object: 'bank_account',
                country: 'PT',
                currency: 'eur',
                account_number: `${account_number}`,
                account_holder_name: name, // Replace with the actual account holder name
                account_holder_type: 'individual', // 'individual' or 'company' depending on the account holder type
                iban: `${iban}`, // Replace with the actual IBAN
                account_holder_address: {
                    line1: '',
                    city: '',
                    postal_code: '',
                    state: '',
                    country: 'PT',
                },
                // Add BIC if required
                // bic: 'BIC_CODE',
            },
        });

        console.log('Created Connect Account:', account);

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: 'https://example.com/reauth',
            return_url: 'https://example.com/return',
            type: 'account_onboarding',
        });

        // Send the account ID back to the client or perform additional actions
        res.json({
            account_id: account.id
            ,
            accountLink: accountLink.url
        });
    } catch (error) {
        console.error('Error creating Connect Account:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/create-checkout-connect', async (req, res) => {
    const {
        accountId,
        priceId,
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
        trial_end,
    } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                {
                    price: 'price_1OKn4iJn0H8EEaz2iHnzqnPm',
                    quantity: 1,
                },
            ],
            subscription_data: {
                application_fee_percent: 1.5,
                transfer_data: {
                    destination: 'acct_1OKmrfR3HxeT2dsc',
                },
            },
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });
        res.send({
            url: session.url
        })
    } catch (err) {
        console.log(err);
    }


});

router.post('/create-recurring-checkout-session', async (req, res) => {
    const { connectedAccountId, productName, currency, priceAmount, customerEmail } = req.body;

    try {
        // Create a new customer
        const customer = await stripe.customers.create({
            email: customerEmail, // Assuming you have the customer's email
        }, {
            stripeAccount: connectedAccountId,
        });

        // Create a new product
        const product = await stripe.products.create({
            name: productName,
        }, {
            stripeAccount: connectedAccountId,
        });

        // Create a price for the product
        const price = await stripe.prices.create({
            unit_amount: Math.ceil(priceAmount * 100), // converting price to cents and applying 5% fee
            currency: currency,
            recurring: { interval: 'month' }, 
            product: product.id,
        }, {
            stripeAccount: connectedAccountId,
        });

        // Create the checkout session with the new price ID and the customer ID
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: customer.id, // Use the customer ID here
            line_items: [{
                price: price.id,
                quantity: 1,
            }],
            success_url: 'https://condoroo.ai/',
            cancel_url: 'https://condoroo.ai/',
        }, {
            stripeAccount: connectedAccountId,
        });

        res.json({ url: session.url, customerId: customer.id });
    } catch (error) {
        console.error('Error creating recurring checkout session:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/add-extra-fee', async (req, res) => {
    const { connectedAccountId, customerId, items } = req.body;

    try {
        // Retrieve the customer's current subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
        }, {
            stripeAccount: connectedAccountId,
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).send('No active subscription found for customer');
        }

        const subscription = subscriptions.data[0];

        // Iterate over each item and add them as a one-time invoice item
        for (const item of items) {
            await stripe.invoiceItems.create({
                customer: customerId,
                amount: Math.ceil(item.price * 100), // converting price to cents and applying 5% fee
                currency: subscription.plan.currency,
                description: item.description,
            }, {
                stripeAccount: connectedAccountId,
            });
        }

        res.send('Extra fees added to next invoice');
    } catch (error) {
        console.error('Error adding extra fees:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/create-manual-checkout-session', async (req, res) => {
    const { connectedAccountId, amount, currency, description } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: description,
                        // You can also add 'description' and 'images' here if needed
                    },
                    unit_amount: parseFloat(amount) * 100, // Convert string to integer and ensure the amount is in the smallest currency unit (e.g., cents for EUR)
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://condoroo.ai/',
            cancel_url: 'https://condoroo.ai/',
        }, {
            stripeAccount: connectedAccountId,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating manual checkout session:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/create-manual-checkout-session-with-extra-quotas', async (req, res) => {
    const { connectedAccountId, amount, items } = req.body;

    try {
        let lineItems = [];

        // Always include quotas as a certain item
        lineItems.push({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: 'Quotas',
                },
                unit_amount: Math.ceil(parseFloat(amount) * 100), // converting price to cents and applying 5% fee
            },
            quantity: 1,
        });

        // Add other items dynamically
        for (let [key, value] of Object.entries(items)) {
            if (key !== 'quotas') { // Skip quotas as it's already added
                lineItems.push({
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
                        },
                        unit_amount: Math.ceil(parseFloat(value) * 100) // converting price to cents and applying 5% fee
                    },
                    quantity: 1,
                });
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://condoroo.ai/',
            cancel_url: 'https://condoroo.ai/',
        }, {
            stripeAccount: connectedAccountId,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating manual checkout session:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
