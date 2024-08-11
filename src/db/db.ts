import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
let client: MongoClient;

async function connectToDatabase(): Promise<void> {
  try {
    const uri: any = process.env.URI;
    client = new MongoClient(uri);
    await client.connect();
  } catch (err) {
    throw err;
  }
}

export default function getDb(dbName: string) {
  connectToDatabase();
  if (!client) {
    throw new Error("Must connect to database first");
  }
  return client.db(dbName);
}
