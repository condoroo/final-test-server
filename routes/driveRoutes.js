const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { Readable } = require('stream');
const stream = require('stream');
const { default: axios } = require('axios');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json'; // Replace with your token file path

// AirTable api keys
const AIRTABLE_API_KEY = `${process.env.AIRTABLE_API_KEY}`;
const AIRTABLE_BASE_ID = `${process.env.AIRTABLE_BASE_ID}`;

//gDrive authorization
const authenticate = async () => {
    const keys = require('../condoroo-83a2d733ac6e.json'); // Replace with the path to your credentials file

    const auth = new JWT({
        email: keys.client_email,
        key: keys.private_key,
        scopes: SCOPES,
    });

    await auth.authorize();
    return auth;
};

// Add files to gDrive
router.post('/add-pdf-to-drive', async (req, res) => {
    const {
        folderId,
        pdfUrl,
        lastInvoiceDate,
        lastInvoiceAmount,
        recordId,
        tableName
    } = req.body;

    try {
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

const createAndUploadExcel = async (folderId, airtableTableName, attachmentFieldName, airtableRecordId) => {
    try {
        // Authenticate with Google
        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });

        // Specify the existing Excel file path
        const existingFilePath = path.join(__dirname, '../documents', 'conciliacao_de_contas.xlsx');

        // Create a readable stream from the existing file
        const fileStream = fs.createReadStream(existingFilePath);

        // Check if folder is an array or an element
        const targetFolderId = Array.isArray(folderId) ? folderId[0] : folderId;

        // Upload the file to Google Drive
        const fileMetadata = {
            name: 'ConciliaçãoDeContas.xlsx',
            parents: [targetFolderId]
        };

        const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            body: fileStream
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });

        // Make the file readable by anyone with the link
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Generate the shareable link
        const shareableLink = `https://drive.google.com/file/d/${file.data.id}/view`;

        // Update the Airtable Record with the File URL
        const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(airtableTableName)}/${airtableRecordId}`;
        const updateData = {
            fields: {
                [attachmentFieldName]: shareableLink
            }
        };

        await axios.patch(airtableURL, updateData, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });

        return { fileShareableLink: shareableLink };
    } catch (error) {
        console.error('Error in creating and uploading Excel file:', error);
        throw new Error('Internal Server Error');
    }
}

//create folder to gDrive
router.post('/create-folder', async (req, res) => {
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

        const fileLink = await createAndUploadExcel(folderIds[8], "Condomínios", "Controlo financeiro", recordId);
        console.log("Excel successfully created", fileLink);

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

// Route to create subfolders inside 'Faturas'
router.post('/create-faturas-subfolders', async (req, res) => {
    const { folderId } = req.body; // ID of the 'Faturas' folder

    try {
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

        // Function to generate formatted month names
        const generateMonths = () => {
            const monthsPerYear = 12;
            const result = [];

            // Get current date
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1; // Adding 1 because months are zero-indexed
            const currentYear = currentDate.getFullYear();

            // Start generating from the current month
            let month = currentMonth;
            let year = currentYear;

            for (let i = 0; i < 24; i++) {
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
        };

        // Generate array of month names
        const monthsArray = generateMonths();

        console.log(monthsArray);

        // Create subfolders for each month inside 'Faturas'
        const folderCreationPromises = monthsArray.map(monthName => createSubfolder(folderId, monthName));
        await Promise.all(folderCreationPromises);

        res.json({ message: 'Subfolders created successfully inside Faturas' });
    } catch (error) {
        console.error('Error creating subfolders in Faturas:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//building folder
router.post('/add-building-subfolder', async (req, res) => {
    const { field, folderId } = req.body;
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

//Create new subfolder for contratos de servicos
router.post('/create-new-subfolder-for-contratos-de-servicos', async (req, res) => {
    const { tableNAME, parentFolderId, folderName, recordID } = req.body;

    try {

        try {
            const auth = await authenticate(); // Authenticate with Google Drive API
            const drive = google.drive({ version: 'v3', auth });

            // Create subfolders in the specified folder

            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            };

            const subfolder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });


            // Update Airtable with folder IDs
            try {
                const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableNAME}/${recordID}`;
                const updateData = {
                    fields: {
                        "Gdrive contratos subfolder ID": subfolder.data.id,
                    },
                };

                await axios.patch(airtableURL, updateData, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });

                console.log('this is folder id', subfolder.data.id);

                res.json({ folderId: subfolder.data.id }); // Respond with the created folder ID
            } catch (error) {
                console.log('Error updating Airtable:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }




            // Respond with the IDs of the created subfolders

            // Update Airtable with the created subfolder IDs


        } catch (googleDriveError) {
            console.error('Error creating subfolders in Google Drive:', googleDriveError);
            res.status(500).json({ error: 'Internal Server Error (Google Drive)' });
        }




    } catch (err) {
        console.log('Error creating new subfolder for contratos de', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//

//new subfolder2
router.post('/create-new-subfolder-for-assembleias', async (req, res) => {
    const { tableNAME, parentFolderId, folderName, recordID } = req.body;

    try {

        try {
            const auth = await authenticate(); // Authenticate with Google Drive API
            const drive = google.drive({ version: 'v3', auth });

            // Create subfolders in the specified folder

            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            };

            const subfolder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });


            // Update Airtable with folder IDs
            try {
                const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableNAME}/${recordID}`;
                const updateData = {
                    fields: {
                        "Gdrive assembleias subfolder ID": subfolder.data.id,
                    },
                };

                await axios.patch(airtableURL, updateData, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });

                console.log('this is folder id', subfolder.data.id);

                res.json({ folderId: subfolder.data.id }); // Respond with the created folder ID
            } catch (error) {
                console.log('Error updating Airtable:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }




            // Respond with the IDs of the created subfolders

            // Update Airtable with the created subfolder IDs


        } catch (googleDriveError) {
            console.error('Error creating subfolders in Google Drive:', googleDriveError);
            res.status(500).json({ error: 'Internal Server Error (Google Drive)' });
        }




    } catch (err) {
        console.log('Error creating new subfolder for contratos de', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
//

//

//new subfolder2
router.post('/create-new-subfolder-for-tarefas', async (req, res) => {
    const { tableNAME, parentFolderId, folderName, recordID } = req.body;

    try {

        try {
            const auth = await authenticate(); // Authenticate with Google Drive API
            const drive = google.drive({ version: 'v3', auth });

            // Create subfolders in the specified folder

            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            };

            const subfolder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id',
            });


            // Update Airtable with folder IDs
            try {
                const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableNAME}/${recordID}`;
                const updateData = {
                    fields: {
                        "Gdrive tarefas subfolder ID": subfolder.data.id,
                    },
                };

                await axios.patch(airtableURL, updateData, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    },
                });

                console.log('this is folder id', subfolder.data.id);

                res.json({ folderId: subfolder.data.id }); // Respond with the created folder ID
            } catch (error) {
                console.log('Error updating Airtable:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }




            // Respond with the IDs of the created subfolders

            // Update Airtable with the created subfolder IDs


        } catch (googleDriveError) {
            console.error('Error creating subfolders in Google Drive:', googleDriveError);
            res.status(500).json({ error: 'Internal Server Error (Google Drive)' });
        }




    } catch (err) {
        console.log('Error creating new subfolder for contratos de', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// save a file from airtable and return its share link.
router.post('/save-and-share-file', async (req, res) => {
    const { airtableRecordId, folderId, airtableTableName, attachmentFieldName, airtableRecordIdColumn } = req.body;

    try {
        // Authentications
        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });

        // Initialize variables for table pagination
        let allRecords = [];
        let offset;

        do {
            // Fetch records from Airtable with pagination
            const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(airtableTableName)}` + (offset ? `?offset=${offset}` : '');
            const response = await axios.get(airtableURL, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                },
            });

            allRecords = allRecords.concat(response.data.records);
            offset = response.data.offset; // Airtable provides the next offset if more records are available
        } while (offset);

        // Find the specific record in that table
        const specificRecord = allRecords.find(record => record.fields[airtableRecordIdColumn] == airtableRecordId);

        // If no file found
        if (!specificRecord || !specificRecord.fields[attachmentFieldName]) {
            throw new Error('Record or attachment not found');
        }

        console.log("This is the specific record: ", specificRecord);
        console.log("This is the file information: ", specificRecord.fields[attachmentFieldName]);

        const fileUrl = specificRecord.fields[attachmentFieldName][0].url; 
        const fileName = specificRecord.fields[attachmentFieldName][0].filename;

        // Download the file from the URL
        const response2 = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });

        // Create a pass-through stream to buffer the file data
        const bufferStream = new stream.PassThrough();
        response2.data.pipe(bufferStream);

        // Check if folder is an array or an element
        const targetFolderId = Array.isArray(folderId) ? folderId[0] : folderId;

        // Upload the file to Google Drive
        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId]
        };

        const media = {
            mimeType: response2.headers['content-type'],
            body: bufferStream
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });

        // Make the file readable by anyone with the link
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Generate the shareable link
        const shareableLink = `https://drive.google.com/file/d/${file.data.id}/view`;

        res.json({ fileShareableLink: shareableLink });
        
    } catch (error) {
        console.error('Error saving and sharing file:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
