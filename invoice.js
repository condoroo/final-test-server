//
//Create customer invoice
/*************************************************************
 *                  Global Variables                        *
 *************************************************************/
// Global Variables
const backendUrl = 'https://sis100.phcgo.net/ec984463/';
const appId = 'C06F947261';
const userCode = 'suporte@condoroo.ai';
const password = 'Shakil1234Test?';
const company = "";
const tokenLifeTime = '1';

/*************************************************************
 *                      Constants                           *
 *************************************************************/
const API_URL = 'https://interface.phcsoftware.com/v3';


const { record_id } = await input.config();
const updatedRecordId = record_id;
console.log(updatedRecordId);
const table = base.getTable("Pagamentos condominios");
console.log(updatedRecordId);

// Get records based on Record ID
const fieldName = "Record_ID";
const queryResult9 = await table.selectRecordsAsync({ fields: [fieldName] });
const greenRecords = queryResult9.records.filter(record => (
    record.getCellValueAsString(fieldName) === updatedRecordId
));
console.log('This is records', greenRecords);

// Check if there are matching records
if (greenRecords.length > 0) {
    // Extract the IDs of the filtered records
    const filteredRecordIds = greenRecords.map(record => record.id);

    // Retrieve all fields for the matching records using the filtered IDs
    const allFields = await table.selectRecordsAsync({ recordIds: filteredRecordIds });

    // Iterate through the records and log their field values
    for (const record of allFields.records) {
        const recordFields = {};

        for (const field of table.fields) {
            recordFields[field.name] = record.getCellValue(field);
        }

        console.log('this is record fields', recordFields);
        const requestData = {
            name: recordFields['Customer name (for Stripe + PHC Go)'],
            email: recordFields['Email do administrador (for stripe)'][0],
            tax_number: recordFields['NIF do condomínio'][0],
            observations: recordFields['Description (for stripe)'][0],
            backendUrl,
            appId,
            userCode,
            password,
            company,
            tokenLifeTime,
            API_URL,
            designation: recordFields['Description for stripe'][0],
            unitPrice: recordFields['Last successful payment amount (for stipe)'],
        }
        console.log('this is request data', requestData);





        // **********************************************
        // Server code//
        // *********************************************
        const serverEndpoint = 'https://fuzzy-belt-bear.cyclic.app/createInvoice'

        // Create a POST request to your server
        const response = await fetch(serverEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: recordFields['Customer name (for Stripe + PHC Go)'],
                email: recordFields['Email do administrador (for stripe)'][0],
                tax_number: recordFields['NIF do condomínio'][0],
                observations: recordFields['Description (for stripe)'][0],
                backendUrl,
                appId,
                userCode,
                password,
                company,
                tokenLifeTime,
                API_URL,
                designation: recordFields['Description for stripe'][0],
                unitPrice: recordFields['Last successful payment amount (for stipe)'],

            }),
        });

        if (response.status === 200) {
            // Successfully received the checkout URL from the server
            const responseData = await response.json();
            console.log('this is response data', responseData)


        } else {
            // Handle errors from the server
            const errorData = await response.json();
        }
        //***********************************
        // ********************************* */

    }
}

