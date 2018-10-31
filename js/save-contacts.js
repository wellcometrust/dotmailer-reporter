const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const axios = require('axios');
const apiBase = 'https://r1-api.dotmailer.com/v2';
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
const { addressBooks } = config;
const dotenv = require('dotenv').config();
const { username, password, s3_bucket_name, s3_key_name } = process.env;
const auth = { username, password };
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sendMail = require('./send-mail');

const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

const tryPromise = fn => (...args) => fn(...args).catch(console.error);

const tryWriteFile = tryPromise(writeFile);
const tryAppendFile = tryPromise(appendFile);

function getLastUpdated() {
  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket: s3_bucket_name,
      Key: s3_key_name
    }, (err, data) => {
      if (err) reject(err);

      resolve(data.Body.toString());
    });
  });
}

const tryGetLastUpdated = tryPromise(getLastUpdated);

async function getAddressBookContactsModifiedSince(id, lastUpdated) {
  const apiEndPoint = `/address-books/${id}/contacts/modified-since/${lastUpdated}`;
  const contacts = await axios.get(`${apiBase}${apiEndPoint}`, { auth });

  return contacts;
}

async function getServerTime() {
  const apiEndPoint = '/server-time'
  const newLastUpdated = await axios.get(`${apiBase}${apiEndPoint}`, { auth });

  return newLastUpdated.data;
}

function updateLastUpdated(time) {
  const bucketParams = {
    Body: time,
    Bucket: s3BucketName,
    Key: s3Key
   };

  s3.putObject(bucketParams, (err, data) => {
    if (err) throw err;
  });
}


async function sendMailAndUpdateTime(lastUpdated) {
  const tryGetServerTime = tryPromise(getServerTime);
  const serverTime = await tryGetServerTime();

  sendMail(lastUpdated, serverTime);
  updateLastUpdated(serverTime);
}

async function saveContacts() {
  const filePath = path.join('/tmp', 'contacts.csv');

  await tryWriteFile(filePath, 'email,source,activity_value\n');

  const lastUpdated = await tryGetLastUpdated();

  addressBooks.forEach(async ({ id }, addressBookIndex) => {
    const contacts = await getAddressBookContactsModifiedSince(id, lastUpdated);

    contacts.data.forEach(async (contact, contactIndex) => {
      await tryAppendFile(filePath, `${contact.email},WEBUP,${addressBooks[addressBookIndex].care_id}\n`);

      if (addressBookIndex === addressBooks.length - 1 && contactIndex === contacts.data.length - 1) {
        sendMailAndUpdateTime(lastUpdated);
      }
    });

    if (addressBookIndex === addressBooks.length - 1 && !contacts.data.length) { // there might not be any contacts in the last address book
      sendMailAndUpdateTime(lastUpdated);
    }
  });
}

module.exports = tryPromise(saveContacts);
