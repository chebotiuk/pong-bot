import { SQSClient, ReceiveMessageCommand, SendMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });
const dlqUrl = process.env.DLQ_URL;
const queueUrl = process.env.SQS_QUEUE_URL;

export const handler = async (event) => {
   const receiveParams = {
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 2
   };

   try {
      const command = new ReceiveMessageCommand(receiveParams);
      const messages = await sqs.send(command);

      if (messages && messages.Messages) {
         for (const message of messages.Messages) {
            try {
               // Redirecting msg to the main queue
               const sendParams = {
                  MessageBody: message.Body,
                  QueueUrl: queueUrl,
                  MessageGroupId: 'PingMessages'
               };

               const sendCommand = new SendMessageCommand(sendParams);
               await sqs.send(sendCommand);

               const deleteParams = {
                  QueueUrl: dlqUrl,
                  ReceiptHandle: message.ReceiptHandle
               };

               const deleteCommand = new DeleteMessageCommand(deleteParams);
               await sqs.send(deleteCommand);

               console.log(`Message redirected to main queue. MessageId: ${message.MessageId}`);
            } catch (error) {
               console.error(`Error redirecting message: ${error}`);
               throw error;
            }
         }
      } else {
         console.log("No messages in DLQ.");
      }
   } catch (error) {
      console.error(`Error receiving messages from DLQ: ${error}`);
   }
}
