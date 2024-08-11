import { Router, Request, Response } from "express";
import Session from "../types/session";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import { getDb } from "../db/db";
import User from "../types/user";
import bcrypt from "bcrypt";

const userRouter = Router();

const getDatabase = async () => {
  try {
    return await getDb();
  } catch (error) {
    throw new Error("Failed to connect to database");
  }
};

userRouter.get("/v1/users/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const users = await db.collection("users").find({}).toArray();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving users" });
  }
});

userRouter.post("/v1/user/register/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const userData: User = req.body;
    userData._id = new ObjectId();
    userData.hashed = bcrypt.hashSync(userData.pwd, bcrypt.genSaltSync(10));

    const existingUsers = await db.collection("users").find({ name: userData.name, email: userData.email }).toArray();

    if (existingUsers.length > 0) {
      res.status(409).send("User already exists.");
      return;
    }

    const result = await db.collection("users").insertOne(userData);
    if (!result.acknowledged) {
      res.status(403).send("Request failed.");
      return;
    }

    const sessionData: Session = {
      _id: new ObjectId(),
      userId: userData._id,
      sessionId: uuidv4(),
    };
    const sessionResult = await db.collection("session").insertOne(sessionData);
    if (!sessionResult.acknowledged) {
      res.status(403).send("Error occurred.");
      return;
    }

    res.status(201).json({
      userId: sessionData._id,
      sessionId: sessionData.sessionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred.");
  }
});

userRouter.post("/v1/user/delete/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const userId: string = req.body.userId;
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
    res.status(result.acknowledged ? 202 : 404).send(result.acknowledged ? "User deleted" : "User deletion failed");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting user");
  }
});

userRouter.post("/v1/user/update/", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const userId: string = req.body.userId;
    const updateData: object = req.body.updateData;

    const result = await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
    res.status(result.acknowledged ? 200 : 404).send(result.acknowledged ? "User updated" : "User update failed");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating user");
  }
});

export default userRouter;
