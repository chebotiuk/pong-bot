require('dotenv').config();
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
        throw error;
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
 * Retrieves the latest transaction from the DynamoDB table using the timestamp as the Sort Key.
 * @param tableName - The name of the DynamoDB table.
 * @returns The latest transaction or null if the table is empty.
 */
const getLatest = async (tableName) => {
  const params = {
      TableName: tableName,
      // Using expression attribute names to avoid reserved keyword conflicts
      ProjectionExpression: "#tx, #ts",
      ExpressionAttributeNames: {
          "#tx": "txHash",
          "#ts": "timestamp"
      }
  };

  try {
      const data = await dynamoDb.scan(params);
      const items = data.Items.sort((a, b) => b.timestamp - a.timestamp);
      return (items[0] === undefined) ? null : items[0];
  } catch (error) {
      console.error("Error fetching latest transaction with scan:", error);
      throw error;
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
        throw error;
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
        throw error;
    }
};

const queryRecordByPartitionKey = async (tableName, partitionKey, partitionKeyValue) => {
  const params = {
      TableName: tableName,
      KeyConditionExpression: `${partitionKey} = :${partitionKey}Value`,
      ExpressionAttributeValues: {
          [`:${partitionKey}Value`]: partitionKeyValue
      }
  };

  try {
      const command = new QueryCommand(params);
      const data = await dynamoDbClient.send(command);
      if (data.Items && data.Items.length > 0) {
          console.log('Records found:', data.Items);
          return data.Items[0];
      } else {
          console.log('No records found');
          return null;
      }
  } catch (error) {
      console.error('Error querying records:', error);
      return null;
  }
};

module.exports = {
    upsertRecord,
    readRecord,
    getLatest,
    updateRecord,
    deleteRecord,
    queryRecordByPartitionKey
};
