import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connector: Function = async (dbName: string) => {
  const uri: string = process.env.URI as string;

  const client: MongoClient = new MongoClient(uri);
  await client.connect().then(()=>{
    const dbInstance = client.db(dbName);
    return dbInstance;
  }).catch((reason)=>{
    return reason;
  });
};

export default connector;