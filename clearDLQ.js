require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

// Initialize the SQS client
const sqsClient = new SQSClient({ region: 'us-east-1' }); // Specify your region
const dlqUrl = process.env.DLQ_URL; // Your DLQ URL

const receiveAndDeleteFromDLQ = async () => {
    const receiveParams = {
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
    };

    try {
        // Receive messages from the DLQ
        const data = await sqsClient.send(new ReceiveMessageCommand(receiveParams));
        
        if (data.Messages) {
            for (const message of data.Messages) {
                console.log(`Received message: ${message.Body}`);

                // Use the new receipt handle to delete the message
                const deleteParams = {
                    QueueUrl: dlqUrl,
                    ReceiptHandle: message.ReceiptHandle, // This is the receipt handle to use
                };

                await sqsClient.send(new DeleteMessageCommand(deleteParams));
                console.log(`Deleted message with ID: ${message.MessageId}`);
            }
        } else {
            console.log('No messages to process from the DLQ');
        }
    } catch (error) {
        console.error('Error receiving or deleting message from DLQ:', error);
    }
};

// Call the function
receiveAndDeleteFromDLQ();
