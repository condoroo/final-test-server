// Import required modules
const express = require('express');
const cors = require('cors');
const { default: axios } = require('axios');
// Create an Express app
const app = express();
const port = 3000;

//////////////////functions

function convertUnixTimestampToDate(unixTimestamp) {
    // // Create a new Date object with the Unix timestamp in milliseconds
    // const dateObject = new Date(unixTimestamp * 1000);

    // // Extract the components (month, day, year) from the date object
    // const month = dateObject.getMonth() + 1; // Months are zero-based, so add 1
    // const day = dateObject.getDate();
    // const year = dateObject.getFullYear();

    // // Format the date as month/date/year
    // const formattedDate = `${month}/${day}/${year}`;

    // return formattedDate;

    // Create a new Date object from the Unix timestamp
    const date = new Date(unixTimestamp * 1000); // Multiply by 1000 to convert to milliseconds

    // Get date components
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    // Get time components
    let hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Determine AM or PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format

    // Create the formatted date/time string
    const formattedDateTime = `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;

    return formattedDateTime;
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
                                "Last successful payment date (for stripe)": convertUnixTimestampToDate(paymentIntentSucceed.created),
                                "Last successful payment ID (for stipe)": paymentIntentSucceed.id,
                                "Last successful payment amount (for stipe)": paymentIntentSucceed.amount / 100,
                                "Last successful payment method (for stipe)": paymentIntentSucceed.payment_method,
                                "Last outstanding balance (for stripe)": paymentIntentSucceed.amount_remaining / 100

                            },
                        };

                        // console.log('Airtable URL:', airtableURL);
                        // console.log('Update Data:', updateData);

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
        case 'invoice.payment_failed':
            const customerInvoiceFailed = event.data.object;
            // Then define and call a function to handle the event customer.subscription.deleted
            const customerID = customerInvoiceFailed.customer;
            const failedDate = convertUnixTimestampToDate(customerInvoiceFailed.created)

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
                    return customerIdFieldValue === customerID;
                });

                console.log({
                    matchingRecord
                })

                if (matchingRecord) {

                    try {
                        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
                        const updateData = {
                            fields: {
                                "Last failed payment date (for stripe)": failedDate,
                                "Last failed payment ID (for stipe)": customerInvoiceFailed.id,
                                "Last failed payment amount (for stipe)": customerInvoiceFailed.amount_remaining / 100,
                                "Last outstanding balance (for stripe)": customerInvoiceFailed.amount_remaining / 100

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
        case 'invoice.payment_succeeded':
            const invoicePaymentIntentSucceed = event.data.object;
            // Then define and call a function to handle the event customer.subscription.paused
            const customerid = invoicePaymentIntentSucceed.customer;
            const successDate = convertUnixTimestampToDate(invoicePaymentIntentSucceed.created);


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
                    return customerIdFieldValue === customerid;
                });

                console.log({
                    matchingRecord
                })

                // Fetch the existing data from the field you want to update
                const existingData = matchingRecord.fields['Last successful payment receipt URL (for stipe)'] || '';
                const newDataValue = invoicePaymentIntentSucceed.hosted_invoice_url;
                // Append the new data to the existing data
                const newData = `Pagamento efetuado em: ${convertUnixTimestampToDate(invoicePaymentIntentSucceed.status_transitions.paid_at)} ${newDataValue} \n\n ${existingData}`;


                if (matchingRecord) {

                    try {
                        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${matchingRecord.id}`;
                        const updateData = {
                            fields: {
                                "Last outstanding balance (for stripe)": invoicePaymentIntentSucceed.amount_remaining / 100,
                                "Last successful payment receipt URL (for stipe)": newData,
                                "Last successful payment date (for stripe)": convertUnixTimestampToDate(invoicePaymentIntentSucceed.status_transitions.paid_at)

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
            subscription_data: {
                billing_cycle_anchor: unixTimestamp,
                // trial_end: trial_end,
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
        // console.log(records);
        const specificRecord = records.find(record => record.id === 'recvbfR2l1O0zQxVT');

        // const recordId = specificRecord.id;
        //--

        // const recordId = 'recbdDOaHbwUgDZgO';
        //update record
        // try {
        //     const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
        //     const updateData = {
        //         fields: {
        //             "Customer ID (for stripe)": 'Updated data',
        //             "Customer created date (for stripe)": 'updated data',
        //         },
        //     };

        //     await axios.patch(airtableURL, updateData, {
        //         headers: {
        //             Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        //         },
        //     });
        //     res.json(specificRecord);

        // } catch (error) {
        //     res.send(error);
        // }
        // end update record

        res.send(specificRecord);
        // res.send(records);

    } catch (error) {
        console.error('Error fetching Airtable records:', error);
        res.status(500).json({ error: 'Unable to fetch records' });
    }
});

app.get('/tes', async (req, res) => {
    const customerId = 'cus_Oytq0OxWH6dz8Y';


});
//
//Create customer invoice
/*************************************************************




/*************************************************************
 *          Route to handle creating customers               *
 *************************************************************/
const createCustomerEndpoint = '/createCustomer';
app.post('/createCustomer', async (req, res) => {
    const generateAccessTokenEndpoint = '/generateAccessToken';
    const { name, email, tax_number, observations,
        backendUrl,
        appId,
        userCode,
        password,
        company,
        tokenLifeTime,
        API_URL,
    } = req.body;

    /////////functions
    /*************************************************************
 *          Function to request access token                 *
 *************************************************************/
    async function requestAccessToken() {
        const url = API_URL + generateAccessTokenEndpoint;

        const credentials = {
            backendUrl,
            appId,
            userCode,
            password,
            company,
            tokenLifeTime,
        };

        try {
            console.log('Requesting access token with credentials:', credentials);
            const response = await axios.post(url, { credentials });
            console.log('Access token response (headers):', response.headers);
            console.log('Access token response (status):', response.status);
            console.log('Access token response (data):', response.data);

            if (response.data.code === 100) {
                console.error('Error in login:', response.data.message);
                throw new Error('Error in login. Please verify your credentials.');
            }
            return response.data.token;
        } catch (error) {
            console.error('Error in access token request:', error.response?.data || error.message);
            throw error;
        }
    }



    /*************************************************************
     *          Function to create a customer                    *
     *************************************************************/
    async function createCustomer(token, customerData) {
        const url = API_URL + createCustomerEndpoint;

        try {
            console.log('Creating customer with token:', token);
            console.log('Customer data:', customerData);

            const response = await axios.post(url, customerData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token,
                },
            });

            console.log('Create customer response:', response.data);

            if (response.data.code === 100) {
                throw new Error('Error creating customer. Server returned code 100.');
            }

            return response.data;
        } catch (error) {
            console.error('Error creating customer:', error.response?.data || error.message);
            throw error;
        }
    }

    //////////
    try {
        // #1 - First, get an access token
        const accessToken = await requestAccessToken();
        console.log(accessToken);
        if (!accessToken) {
            throw new Error('Error generating access token');
        }

        console.log('Access Token Generated Successfully!');

        // #2 - Basic data to create the necessary customer
        const customerData = {
            customer: {
                name: name,
                address: '',
                postalCode: '',
                city: '',
                country: 'Pt',
                email: email,
                taxNumber: tax_number,
                phone: '',
                mobilePhone: '',
                iban: '',
                bic: '',
                observations: observations,
            },
        };

        // Make the request to create a customer
        const customerCreationData = await createCustomer(accessToken, customerData);

        res.json(customerCreationData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 100, message: 'Internal Server Error' });
    }
});




//

/*************************************************************
 *          Route to handle creating customers and invoices   *
 *************************************************************/
app.post('/createInvoice', async (req, res) => {
    const generateAccessTokenEndpoint = '/generateAccessToken';
    const createDocumentEndpoint = '/createDocument';
    const { name, email, tax_number, observations,
        backendUrl,
        appId,
        userCode,
        password,
        company,
        tokenLifeTime,
        API_URL,
        designation,
        unitPrice,
        number
    } = req.body;
    console.log('this is tax number', tax_number);
    /////////functions
    /*************************************************************
 *          Function to request access token                 *
 *************************************************************/
    async function requestAccessToken() {
        const url = API_URL + generateAccessTokenEndpoint;

        const credentials = {
            backendUrl,
            appId,
            userCode,
            password,
            company,
            tokenLifeTime,
        };

        try {
            console.log('Requesting access token with credentials:', credentials);
            const response = await axios.post(url, { credentials });
            console.log('Access token response (headers):', response.headers);
            console.log('Access token response (status):', response.status);
            console.log('Access token response (data):', response.data);

            if (response.data.code === 100) {
                console.error('Error in login:', response.data.message);
                throw new Error('Error in login. Please verify your credentials.');
            }
            return response.data.token;
        } catch (error) {
            console.error('Error in access token request:', error.response?.data || error.message);
            throw error;
        }
    }
    async function createDocument(token, documentData) {
        const url = API_URL + createDocumentEndpoint;

        try {
            const response = await axios.post(url, documentData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token,
                },
            });

            console.log('Create document response:', response.data);

            if (response.data.code === 100) {
                console.error('Error creating document:', response.data.message);
                throw new Error('Error creating document');
            }

            return response.data;
        } catch (error) {
            console.error('Error creating document:', error.response?.data || error.message);
            throw error;
        }
    }

    try {
        // #1 - First, get an access token
        const accessToken = await requestAccessToken();
        console.log('Access Token Generated Successfully!');

        // #2 - Create a document
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
                invoicingAddress1: '',
                invoicingPostalCode: '',
                invoicingLocality: '',
                documentObservations: observations,
            },
            products: [
                {
                    reference: '',
                    designation: designation,
                    unitCode: 'M',
                    unitPrice: unitPrice,
                    quantity: 1,
                    taxIncluded: true,
                    taxPercentage: 23,
                    taxRegion: 'PT',
                }
            ],
        };

        const creationMessage = await createDocument(accessToken, documentData);
        console.log(creationMessage);

        res.json(creationMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 100, message: 'Internal Server Error' });
    }
});




// **************************************************************


const fs = require('fs');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { Readable } = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json'; // Replace with your token file path
//gDrive authorization
const authenticate = async () => {
    const keys = require('./condoroo-83a2d733ac6e.json'); // Replace with the path to your credentials file

    const auth = new JWT({
        email: keys.client_email,
        key: keys.private_key,
        scopes: SCOPES,
    });

    await auth.authorize();
    return auth;
};
//add files to gDrive
app.post('/add-pdf-to-drive', async (req, res) => {
    const {
        folderId,
        pdfUrl,
        lastInvoiceDate,
        lastInvoiceAmount,
        recordId,
        tableName
    } = req.body;

    try {



        // pdfUrl = 'https://sis100.phcgo.net/ec984463//phcws/cfile.aspx?fileName=Fatura%20-%2010%20-%2003.12.2023%20-%20Consumidor%20Final%20-%20253162793.pdf'; // Replace with the actual URL
        // ... (other code)

        // Download PDF from URL
        const { data } = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        console.log(data);
        // Authenticate using the JWT client
        const auth = await authenticate();

        const drive = google.drive({ version: 'v3', auth });

        // Upload PDF to Google Drive
        const fileMetadata = {
            name: `invoice_id_${Math.random(8)}.pdf`, // Replace with your desired file name
            parents: [folderId],
        };

        // Convert the buffer to a readable stream
        const media = {
            mimeType: 'application/pdf',
            body: Readable.from([Buffer.from(data, 'binary')]),
        };

        const uploadedFile = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id',
        });

        /////////////////////////////////////

        // Append the new data to the existing data
        // const newData = `Fatura emitida em "${lastInvoiceDate}" no valor de " ${lastInvoiceAmount}€" \n\n ${existingData}`;

        //
        //         Last invoice date(for PHC GO)

        // Last invoice amount(for PHC GO)

        // Last invoice URL(for PHC GO)

        //             "Fatura emitida em " & date & " no valor de " & amount & "€"
        //
        //////////////////////////
        const customerid = recordId;

        try {
            const airtableURL2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;
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
                const customerIdFieldValue = record.fields["Record ID (for stripe)"];
                return customerIdFieldValue === customerid;
            });

            console.log({
                matchingRecord
            })

            function formatDate(inputDate) {
                const date = new Date(inputDate);

                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();

                return `${day}/${month}/${year}`;
            }

            function formatNumberWithTwoDecimals(number) {
                if (typeof number !== 'number') {
                    throw new Error('Input must be a number');
                }

                return number.toFixed(2);
            }

            // Fetch the existing data from the field you want to update
            const existingData = matchingRecord.fields['Last invoice URL (for PHC GO)'] || '';
            // Append the new data to the existing data
            const newData = `Fatura emitida em "${formatDate(lastInvoiceDate)}" no valor de " ${formatNumberWithTwoDecimals(lastInvoiceAmount)}€" \n\n ${existingData}`;


            if (matchingRecord) {

                try {
                    const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
                    const updateData = {
                        fields: {
                            "Last invoice date (for PHC GO)": lastInvoiceDate,
                            "Last invoice amount (for PHC GO)": lastInvoiceAmount,
                            "Last invoice URL (for PHC GO)": newData,

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

        //////////////////////////////////////////////

        res.json({ fileId: uploadedFile.data.id });
    } catch (error) {
        console.error('Error adding PDF to Google Drive:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




//create folder to gDrive
// app.post('/create-folder', async (req, res) => {
//     const { name
//         , tableName,
//         recordId

//     } = req.body;
//     try {
//         const parentFolderId = '11hEU4GxEiWQuwARM64givbX_t_rskgZZ'; // Replace with your parent folder ID
//         const auth = await authenticate();
//         const drive = google.drive({ version: 'v3', auth });

//         // Create a folder in Google Drive inside the specified parent folder
//         const folderMetadata = {
//             name: `${name}`, // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [parentFolderId],
//         };

//         const subfolder = await drive.files.create({
//             resource: folderMetadata,
//             fields: 'id',
//         });
//         //1
//         const folderMetadata2 = {
//             name: '1. Frações', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder1 = await drive.files.create({
//             resource: folderMetadata2,
//             fields: 'id',
//         });

//         //2
//         const folderMetadata3 = {
//             name: '2. Assembleias', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder2 = await drive.files.create({
//             resource: folderMetadata3,
//             fields: 'id',
//         });

//         //3
//         const folderMetadata4 = {
//             name: '3. Contas bancárias', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder3 = await drive.files.create({
//             resource: folderMetadata4,
//             fields: 'id',
//         });
//         //4
//         const folderMetadata5 = {
//             name: '4. Contratos de serviços', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder4 = await drive.files.create({
//             resource: folderMetadata5,
//             fields: 'id',
//         });
//         //5
//         const folderMetadata6 = {
//             name: '5. Documentos', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder5 = await drive.files.create({
//             resource: folderMetadata6,
//             fields: 'id',
//         });
//         //6
//         const folderMetadata7 = {
//             name: '6. Faturas', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };

//         //Extra folder






//         //

//         const folder6 = await drive.files.create({
//             resource: folderMetadata7,
//             fields: 'id',
//         });

//         //folder6 subfolder
//         for (const nameOfMonths of monthsArray) {
//             console.log(nameOfMonths);

//             const subFolders = {
//                 name: nameOfMonths,
//                 mimeType: 'application/vnd.google-apps.folder',
//                 parents: [folder6.data.id],
//             };

//             await drive.files.create({
//                 resource: subFolders,
//                 fields: 'id',
//             });

//         }
//         //

//         //7
//         const folderMetadata8 = {
//             name: '7. Planos', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };

//         const folder7 = await drive.files.create({
//             resource: folderMetadata8,
//             fields: 'id',
//         });

//         //8
//         const folderMetadata9 = {
//             name: '8. Tarefas', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };

//         const folder8 = await drive.files.create({
//             resource: folderMetadata9,
//             fields: 'id',
//         });

//         //9
//         const folderMetadata10 = {
//             name: '9. Finanças', // Replace with your desired subfolder name
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [subfolder.data.id],
//         };
//         const folder9 = await drive.files.create({
//             resource: folderMetadata10,
//             fields: 'id',
//         });

//         //
//         //         Gdrive main folder ID: null
//         // Gdrive faturas folder ID: null
//         // Gdrive documentos folder ID: null
//         // Gdrive contratos de servicos folder ID: null
//         // Gdrive Contas bancarias folder ID: null
//         // Gdrive assembleias folder ID: null
//         // Gdrive fracoes folder ID: null
//         // Gdrive planos folder ID: null
//         // Gdrive tarefas folder ID: null
//         //

//         try {
//             const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
//             const updateData = {
//                 fields: {
//                     "Gdrive main folder ID": subfolder.data.id,
//                     "Gdrive faturas folder ID": folder6.data.id,
//                     "Gdrive documentos folder ID": folder5.data.id,
//                     "Gdrive contratos de servicos folder ID": folder4.data.id,
//                     "Gdrive Contas bancarias folder ID": folder3.data.id,
//                     "Gdrive assembleias folder ID": folder2.data.id,
//                     "Gdrive fracoes folder ID": folder1.data.id,
//                     "Gdrive planos folder ID": folder7.data.id,
//                     "Gdrive tarefas folder ID": folder8.data.id,
//                     "Gdrive financas folder ID": folder9.data.id,
//                 },
//             };

//             await axios.patch(airtableURL, updateData, {
//                 headers: {
//                     Authorization: `Bearer ${AIRTABLE_API_KEY}`,
//                 },
//             });
//             // res.json(specificRecord);

//         } catch (error) {
//             // res.send(error);
//             console.log(error);
//         }


//         res.json({
//             mainFolder: subfolder.data.id,
//             folder1: folder1.data.id,
//             folder2: folder2.data.id,
//             folder3: folder3.data.id,
//             folder4: folder4.data.id,
//             folder5: folder5.data.id,
//             folder6: folder6.data.id,
//             folder7: folder7.data.id,
//             folder8: folder8.data.id,
//             folder9: folder9.data.id,

//         });
//     } catch (error) {
//         console.error('Error creating subfolder in Google Drive:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });
app.post('/create-folder', async (req, res) => {
    const { name, tableName, recordId } = req.body;

    try {
        const parentFolderId = '11hEU4GxEiWQuwARM64givbX_t_rskgZZ';
        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });

        // Helper function to create a subfolder
        const createSubfolder = async (parentFolderId, folderName) => {
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            };

            const folder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });

            return folder.data.id;
        };

        // Create the main folder
        const mainFolderId = await createSubfolder(parentFolderId, name);

        // Define subfolder names
        const subfolderNames = [
            '1. Frações',
            '2. Assembleias',
            '3. Contas bancárias',
            '4. Contratos de serviços',
            '5. Documentos',
            '6. Faturas',
            '7. Planos',
            '8. Tarefas',
            '9. Finanças',
        ];

        // Create an array to store the folder IDs
        const folderIds = [];

        // Create subfolders
        for (const subfolderName of subfolderNames) {
            const folderId = await createSubfolder(mainFolderId, subfolderName);
            folderIds.push(folderId);
        }

        // Create subfolders inside '6. Faturas'
        const folder6 = folderIds[5]; // Index 5 corresponds to '6. Faturas'

        function generateMonths() {
            const monthsPerYear = 12;
            const result = [];

            // Get current date
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1; // Adding 1 because months are zero-indexed
            const currentYear = currentDate.getFullYear();

            // Start generating from the current month
            let month = currentMonth;
            let year = currentYear;

            for (let i = 0; i < 36; i++) {
                // Adjust year and month when necessary
                if (month > monthsPerYear) {
                    month = 1;
                    year++;
                }

                const formattedMonth = `${String(year).slice(2)}.${(month < 10 ? '0' : '') + month} ${new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' })} ${String(year).slice(2)}`;
                result.push(formattedMonth);

                month++;
            }

            return result;
        }

        const monthsArray = generateMonths();
        console.log(monthsArray);

        // Create subfolders for each month inside '6. Faturas'
        for (const nameOfMonths of monthsArray) {
            await createSubfolder(folder6, nameOfMonths);
        }

        // Update Airtable with folder IDs
        try {
            const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
            const updateData = {
                fields: {
                    "Gdrive main folder ID": mainFolderId,
                    "Gdrive faturas folder ID": folderIds[5], // Index 5 corresponds to '6. Faturas'
                    "Gdrive documentos folder ID": folderIds[4], // Index 4 corresponds to '5. Documentos'
                    "Gdrive contratos de servicos folder ID": folderIds[3], // Index 3 corresponds to '4. Contratos de serviços'
                    "Gdrive Contas bancarias folder ID": folderIds[2], // Index 2 corresponds to '3. Contas bancárias'
                    "Gdrive assembleias folder ID": folderIds[1], // Index 1 corresponds to '2. Assembleias'
                    "Gdrive fracoes folder ID": folderIds[0], // Index 0 corresponds to '1. Frações'
                    "Gdrive planos folder ID": folderIds[6], // Index 6 corresponds to '7. Planos'
                    "Gdrive tarefas folder ID": folderIds[7], // Index 7 corresponds to '8. Tarefas'
                    "Gdrive financas folder ID": folderIds[8], // Index 8 corresponds to '9. Finanças'
                },
            };

            await axios.patch(airtableURL, updateData, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            });
        } catch (error) {
            console.log(error);
        }

        // Respond with folder IDs
        res.json({
            mainFolder: mainFolderId,
            folder1: folderIds[0],
            folder2: folderIds[1],
            folder3: folderIds[2],
            folder4: folderIds[3],
            folder5: folderIds[4],
            folder6: folderIds[5],
            folder7: folderIds[6],
            folder8: folderIds[7],
            folder9: folderIds[8],
        });
    } catch (error) {
        console.error('Error creating subfolder in Google Drive:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



//building folder
app.post('/add-building-subfolder', async (req, res) => {
    const { field, folderId, tableNAME } = req.body;
    console.log(field, folderId);

    try {
        const auth = await authenticate(); // Authenticate with Google Drive API
        const drive = google.drive({ version: 'v3', auth });

        // Create subfolders in the specified folder
        const subfolderIds = [];
        for (const folder of field) {
            const folderMetadata = {
                name: folder.name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [folderId],
            };

            const subfolder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });

            subfolderIds.push(subfolder.data.id);
        }

        // Respond with the IDs of the created subfolders

        // Update Airtable with the created subfolder IDs
        res.json({ subfolderIds });

    } catch (googleDriveError) {
        console.error('Error creating subfolders in Google Drive:', googleDriveError);
        res.status(500).json({ error: 'Internal Server Error (Google Drive)' });
    }
});


// ++++++++++++++++++++++++++++++++++
// Stripe Connect API
// ++++++++++++++++++++++++++++++++++++
// Endpoint to create an Account Link for an existing customer
// Endpoint to create a Custom Connect account for an existing customer
app.post('/create-connect-account', async (req, res) => {
    try {
        // Create a custom account for Portugal
        const account = await stripe.accounts.create({
            type: 'custom',
            country: 'PT',
            email: 'business.email@example.com', // Replace with the business email
            business_type: 'company', // 'individual' or 'company' depending on your use case
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            company: {
                name: 'CARR',
                address: {
                    line1: '123 Main Street',
                    city: 'City',
                    postal_code: '5400-800',
                    state: 'State',
                },
                phone: '+351915245709', // Replace with the actual phone number
                tax_id: '123-45-6789', // Replace with the actual tax ID
                registration_number: '12345678', // Replace with the actual registration number
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
                account_number: 'PT50000201231234567890154',
                account_holder_name: 'Account Holder Name', // Replace with the actual account holder name
                account_holder_type: 'individual', // 'individual' or 'company' depending on the account holder type
                iban: 'PT50123456789012345678901', // Replace with the actual IBAN
                account_holder_address: {
                    line1: '123 Main Street',
                    city: 'City',
                    postal_code: '5400-800',
                    state: 'State',
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



//checkout api for connected account
// Endpoint to create a Checkout Session for subscription payment
app.post('/create-checkout-connect', async (req, res) => {
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






//+++++++++++++++++++++++++++++++++++++




// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
