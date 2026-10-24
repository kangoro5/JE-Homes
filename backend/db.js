const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGODB_DB || 'je_homes';
const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });

let database;

async function connectDB() {
  if (database) return database;

  await client.connect();
  database = client.db(databaseName);
  await database.collection('bookings').createIndex({ id: 1 }, { unique: true });
  return database;
}

function getDB() {
  if (!database) {
    throw new Error('Database is not connected');
  }
  return database;
}

async function closeDB() {
  await client.close();
  database = undefined;
}

module.exports = { connectDB, getDB, closeDB };
