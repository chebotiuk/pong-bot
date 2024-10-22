require('dotenv').config();
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB Document Client
const dynamoDbClient = new DynamoDB({ region: 'us-east-1' });
const dynamoDb = DynamoDBDocument.from(dynamoDbClient);

/**
 * Creates or updates a record in the specified DynamoDB table.
 * @param tableName - The name of the DynamoDB table.
 * @param item - The key-value pair object to store in the table.
 * @returns A promise that resolves when the operation is complete.
 */
const upsertRecord = async (tableName, item) => {
    const params = {
        TableName: tableName,
        Item: item
    };

    try {
        await dynamoDb.put(params);
        console.log(`Record created/updated in table ${tableName}:`, item);
    } catch (error) {
        console.error('Error creating/updating record:', error);
    }
};

/**
 * Reads a record from the specified DynamoDB table.
 * @param tableName - The name of the DynamoDB table.
 * @param key - The key used to retrieve the item.
 * @returns The retrieved item or null if not found.
 */
const readRecord = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key
    };

    try {
        const data = await dynamoDb.get(params);
        if (data.Item) {
            console.log('Record found:', data.Item);
            return data.Item;
        } else {
            console.log('No record found');
            return null;
        }
    } catch (error) {
        console.error('Error reading record:', error);
        return null;
    }
};

/**
 * Updates a record in the specified DynamoDB table.
 * @param tableName - The name of the DynamoDB table.
 * @param key - The key used to identify the item.
 * @param updateExpression - The update expression defining the changes.
 * @param expressionValues - The values to be substituted in the update expression.
 * @returns A promise that resolves when the update is complete.
 */
const updateRecord = async (tableName, key, updateExpression, expressionValues) => {
    const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues
    };

    try {
        await dynamoDb.update(params);
        console.log(`Record updated in table ${tableName}:`, key);
    } catch (error) {
        console.error('Error updating record:', error);
    }
};

/**
 * Deletes a record from the specified DynamoDB table.
 * @param tableName - The name of the DynamoDB table.
 * @param key - The key used to identify the item.
 * @returns A promise that resolves when the deletion is complete.
 */
const deleteRecord = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key
    };

    try {
        await dynamoDb.delete(params);
        console.log(`Record deleted from table ${tableName}:`, key);
    } catch (error) {
        console.error('Error deleting record:', error);
    }
};

module.exports = {
    upsertRecord,
    readRecord,
    updateRecord,
    deleteRecord
};
