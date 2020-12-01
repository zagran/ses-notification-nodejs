'use strict';

var AWS = require('aws-sdk');
const https = require('https');

AWS.config.update({apiVersion: '2012-08-10'});

const ses = new AWS.SES({apiVersion: '2010-12-01'});
const FROM_EMAIL = '';
const NOTIFICATION_EMAIL = '';

exports.handler = (event, context, callback) => {

  console.log('Received event:', JSON.stringify(event, null, 4));
  const message = JSON.parse(event.Records[0].Sns.Message);

  switch(message.notificationType) {
    case "Bounce":
      console.log('Bounce')
      handleBounce(message);
      break;
    case "Complaint":
      console.log('Complaint')
      handleComplaint(message);
      break;
    case "Delivery":
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

  if (bounceType != 'Transient'){
    for (var i=0; i<addresses.length; i++){
      let text = "Message " + messageId + " bounced when sending to " + addresses[i] + ". Bounce type: " + bounceType;
      console.log(text);
      sendEmail(NOTIFICATION_EMAIL, 'RB BOUNCE ALERT', text, FROM_EMAIL);
    }
  }
}

function handleComplaint(message) {
  const messageId = message.mail.messageId;
  const addresses = message.complaint.complainedRecipients.map(function(recipient){
    return recipient.emailAddress;
  });

  for (var i=0; i<addresses.length; i++){
    let text = "A complaint was reported by " + addresses[i] + " for message " + messageId + ".";
    console.log(text);
    sendEmail(NOTIFICATION_EMAIL, 'RB COMPLIANT ALERT', text, FROM_EMAIL);
  }
}

const sendEmail = (to, subject, message, from) => {
    const params = {
        Destination: {
            ToAddresses: [to]
        },
        Message: {
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: message
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        ReturnPath: from,
        Source: from,
    };

    ses.sendEmail(params, (err, data) => {
        if (err) {
            return console.log(err, err.stack);
        } else {
            console.log("Email sent.", data);
        }
    });
};
