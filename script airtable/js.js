//functions
function getBillingCycleAnchor() {
    const currentDate = new Date();

    // Set the date to the 5th of the next month
    currentDate.setMonth(currentDate.getMonth() + 1, 5);

    // Format the date as MM/DD/YYYY
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = '05';
    const year = currentDate.getFullYear();

    return `${month}/${day}/${year}`;
}
//
const { record_id } = await input.config();
const updatedRecordId = record_id[0];
console.log(updatedRecordId);
const table = base.getTable("Pagamentos");
console.log(updatedRecordId);

const secretKey = 'sk_test_51M5vv4CLTcmkmHRYZkWtQyNXEjCP43tttOJZXjfQz5PoCOpXZK6cuZOtKR91YWnidNeWZasoQVI9DUxdmkg5nliB00Nh97yLKB';
const currency = 'eur';
const reDirectUrl = 'https://www.Condoroo.ai';
const imageUrl = 'https://condoroo.ai/wp-content/uploads/2023/11/transparent_stripe.png';

// Get records based on Record ID
const fieldName = "Record ID (for stripe)";
const queryResult9 = await table.selectRecordsAsync({ fields: [fieldName] });
const greenRecords = queryResult9.records.filter(record => (
    record.getCellValueAsString(fieldName) === updatedRecordId
));
console.log('This is records', greenRecords);

// Check if there are matching records
if (greenRecords.length > 0) {
    // Extract the IDs of the filtered records
    const filteredRecordIds = greenRecords.map(record => record.id);

    // Retrieve all fields for the matching records using the filtered IDs
    const allFields = await table.selectRecordsAsync({ recordIds: filteredRecordIds });

    // Iterate through the records and log their field values
    for (const record of allFields.records) {
        const recordFields = {};

        for (const field of table.fields) {
            recordFields[field.name] = record.getCellValue(field);
        }


        const recordId = updatedRecordId;
        console.log(recordFields['Código-postal']);
        const dateOfBillingNextDay = getBillingCycleAnchor();
        const requestData = {
            userEmail: recordFields['Email do administrador (for stripe)'],
            unitPrice: recordFields['Preço plano escolhido mensal (com IVA) (for documint)'][0],
            interval: "month",
            productName: recordFields['Description (for stripe)'][0],
            currency,
            imageUrl,
            reDirectUrl,
            recordId,
            billing_cycle_anchor: dateOfBillingNextDay,
        }
        console.log(requestData)

        //stripe checkOut request
        const serverEndpoint = 'https://fuzzy-belt-bear.cyclic.app/create-subscription'

        // Create a POST request to your server
        const response = await fetch(serverEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (response.status === 200) {
            // Successfully received the checkout URL from the server
            const responseData = await response.json();
            const checkoutUrl = responseData.checkoutUrl;
            console.log(checkoutUrl)

            // Update the Airtable record with the generated checkout URL
            const queryResult1 = await table.selectRecordsAsync();

            let recordToUpdate = null;

            // Iterate through the records to find the one with the matching updatedRecordId
            for (const record of queryResult1.records) {
                if (record.id === updatedRecordId) {
                    console.log(record)
                    if (record) {
                        // Update the specific field (e.g., 'Name') of the record
                        await table.updateRecordAsync(record, {
                            'Link for checkout (for stripe)': checkoutUrl, // Replace 'Name' with the actual field name you want to update
                        });


                    } else {

                    }
                    break;
                }
            }



        } else {
            // Handle errors from the server
            const errorData = await response.json();

        }
    }
}

