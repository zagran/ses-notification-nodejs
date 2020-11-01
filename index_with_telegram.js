'use strict';

console.log('Loading function');

var AWS = require('aws-sdk');
const https = require('https');
AWS.config.update({apiVersion: '2012-08-10'});

var dynamodb = new AWS.DynamoDB.DocumentClient();

let tableName = 'mailing';

exports.handler = (event, context, callback) => {

  console.log('Received event:', JSON.stringify(event, null, 2));
  const message = JSON.parse(event.Records[0].Sns.Message);

  switch(message.notificationType) {
    case "Bounce":
      handleBounce(message);
      break;
    case "Complaint":
      handleComplaint(message);
      break;
    case "Delivery":
      handleDelivery(message);
      break;
    default:
      callback("Unknown notification type: " + message.notificationType);
  }

};

function handleBounce(message) {
  const messageId = message.mail.messageId;
  const addresses = message.bounce.bouncedRecipients.map(function(recipient){
    return recipient.emailAddress;
  });
  const bounceType = message.bounce.bounceType;

  let text = "Message " + messageId + " bounced when sending to " + addresses.join(", ") + ". Bounce type: " + bounceType;
  writeToTelegram(text);
  console.log(text);
  for (var i=0; i<addresses.length; i++){
    writeDDB(addresses[i], message, tableName, "disable");
  }
}

function handleComplaint(message) {
  const messageId = message.mail.messageId;
  const addresses = message.complaint.complainedRecipients.map(function(recipient){
    return recipient.emailAddress;
  });

  let text = "A complaint was reported by " + addresses.join(", ") + " for message " + messageId + ".";
  writeToTelegram(text);
  console.log(text);

  for (var i=0; i<addresses.length; i++){
    writeDDB(addresses[i], message, tableName, "disable");
  }
}

function handleDelivery(message) {
  const messageId = message.mail.messageId;
  const deliveryTimestamp = message.delivery.timestamp;
  const addresses = message.delivery.recipients

  let text = "Message " + messageId + " was delivered successfully at " + deliveryTimestamp + ".";
  writeToTelegram(text);
  console.log(text);
  for (var i=0; i<addresses.length; i++){
    writeDDB(addresses[i], message, tableName, "enable");
  }
}


function writeToTelegram(message){
  const TOKEN = '';
  const CHAT_ID = '';
  let url =  `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}`;

  https.get(url, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', () => {
      console.log(JSON.parse(data));
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });

}

function writeDDB(id, payload, tableName, status) {
  dynamodb.put({
    "TableName": tableName,
    "Item" : {
      "UserId": id,
      "notificationType": payload.notificationType,
      "from": payload.mail.source,
      "timestamp": payload.mail.timestamp,
      "state": status
    }
  }, function(err, data) {
    if (err) {
      console.log(`Error putting item into dynamodb failed: ${JSON.stringify(err)}`);
    }
  });
}
