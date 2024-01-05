const express = require('express');
const router = express.Router();

const { default: axios } = require('axios');


// AirTable api keys
const AIRTABLE_API_KEY = `${process.env.AIRTABLE_API_KEY}`;
const AIRTABLE_BASE_ID = `${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_TABLE_NAME = `${process.env.AIRTABLE_TABLE_NAME}`;

router.get('/get-records', async (req, res) => {
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

        res.send(specificRecord);
        // res.send(records);

    } catch (error) {
        console.error('Error fetching Airtable records:', error);
        res.status(500).json({ error: 'Unable to fetch records' });
    }
});

module.exports = router;
