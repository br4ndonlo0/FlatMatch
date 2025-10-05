import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'your_default_mongodb_uri';
let client: MongoClient;

export const connectDB = async () => {
  if (!client) {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
  }
  return client.db('your_database_name');
};