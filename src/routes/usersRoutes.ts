import { Router, Request, Response } from "express";
import Session from "../types/session";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import User from "../types/user";
import getDb from "../db/db";
import bcrypt from "bcrypt";

const userRouter = Router();
const db = getDb("wt-data");

userRouter.get(
  "/v1/users/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await db.collection("users").find({}).toArray();
      res.json(users);
    } catch (error) {
      res.status(500).json({
        db: db,
        message: "Error retrieving users",
      });
    }
  }
);

userRouter.post(
  "/v1/user/register/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: User = req.body;
      userData._id = new ObjectId();
      userData.hashed = bcrypt.hashSync(userData.pwd, bcrypt.genSaltSync(10));

      const existingUsers = await db
        .collection("users")
        .find({ name: userData.name, email: userData.email })
        .toArray();

      if (existingUsers.length > 0) {
        res.status(409).send("User already exists.");
      } else {
        const result = await db.collection("users").insertOne(userData);
        if (result.acknowledged) {
          const sessionData: Session = {
            _id: new ObjectId(),
            userId: userData._id,
            sessionId: uuidv4(),
          };
          const sessionResult = await db
            .collection("session")
            .insertOne(sessionData);
          if (sessionResult.acknowledged) {
            res.status(201).json({
              userId: sessionData._id,
              sessionId: sessionData.sessionId,
            });
          } else {
            res.status(403).send("Error occurred.");
          }
        } else {
          res.status(403).send("Request failed.");
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Error occurred.");
    }
  }
);

userRouter.post(
  "/v1/user/delete/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId: string = req.body.userId;
      const result = await db
        .collection("users")
        .deleteOne({ _id: new ObjectId(userId) });
      res
        .status(result.acknowledged ? 202 : 404)
        .send(result.acknowledged ? "User deleted" : "User deletion failed");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error deleting user");
    }
  }
);

userRouter.post(
  "/v1/user/update/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId: string = req.body.userId;
      const updateData: object = req.body.updateData;

      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
      res
        .status(result.acknowledged ? 201 : 404)
        .send(result.acknowledged ? "User updated" : "User update failed");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error updating user");
    }
  }
);

export default userRouter;
