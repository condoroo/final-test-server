const express = require('express');
const router = express.Router();

const { default: axios } = require('axios');

const createCustomerEndpoint = '/createCustomer';

router.post('/createCustomer', async (req, res) => {
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

router.post('/createInvoice', async (req, res) => {
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

module.exports = router;
