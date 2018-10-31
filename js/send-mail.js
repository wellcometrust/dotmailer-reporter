const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv').config();
const { email_user, email_password } = process.env;

function sendMail(lastUpdated, now) {
  const lastUpdatedDate = new Date(lastUpdated);
  const nowDate = new Date(now);
  const lastUpdatedDateString = lastUpdatedDate.toLocaleString();
  const nowDateString = nowDate.toLocaleString();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email_user,
      pass: email_password
    }
  });

  const mailOptions = {
    from: `"Dotmailer Report" <${email_user}@gmail.com>`,
    to: 'xxx@yyy.com, aaa@bbb.co.uk',
    subject: 'Dotmailer contacts',
    text: `New Dotmailer contacts from ${lastUpdatedDateString} to ${nowDateString}`,
    html: `<p>New Dotmailer contacts from ${lastUpdatedDateString} to ${nowDateString}</p>`,
    attachments: [{
      filename: 'contacts.csv',
      path: '/tmp/contacts.csv'
    }]
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error(error);
    }

    console.log('Message sent: %s', info.messageId);
  });
}

module.exports = sendMail;
