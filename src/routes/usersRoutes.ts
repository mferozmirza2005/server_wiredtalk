import { Router, Request, Response } from "express";
import Session from "../models/session";
import { GridFSBucket } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import User from "../models/user";
import { Readable } from "stream";
import { getDb } from "../db/db";
import multer from "multer";
import bcrypt from "bcrypt";

const userRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const getDatabase = async () => {
  try {
    return await getDb();
  } catch (error) {
    throw new Error("Failed to connect to database");
  }
};

userRouter.post(
  "/v1/user/register/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const userData: User = req.body;
      userData._id = new ObjectId();
      userData.hashed = bcrypt.hashSync(userData.pwd, bcrypt.genSaltSync(10));

      const existingUsers = await db
        .collection("users")
        .find({ name: userData.name, email: userData.email })
        .toArray();

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
      const sessionResult = await db
        .collection("session")
        .insertOne(sessionData);
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
  }
);

userRouter.post(
  "/v1/user/login/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const userData = req.body;

      if (!userData?.email || !userData?.pwd) {
        res.status(400).send("Missing email or password.");
        return;
      }

      const existingUser = await db
        .collection("users")
        .findOne({ email: userData.email });

      if (!existingUser) {
        res.status(404).send("User not found.");
        return;
      }

      const isPasswordValid = bcrypt.compareSync(
        userData.pwd,
        existingUser.hashed
      );

      if (!isPasswordValid) {
        res.status(401).send("Invalid password.");
        return;
      }

      const sessionId = uuidv4();

      const sessionResult = await db
        .collection("session")
        .updateOne(
          { userId: existingUser._id },
          { $set: { sessionId: sessionId } },
          { upsert: true }
        );

      if (!sessionResult.acknowledged) {
        res.status(403).send("Error occurred while creating session.");
        return;
      }

      res.status(200).json({
        userId: existingUser._id,
        sessionId: sessionId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error.");
    }
  }
);

userRouter.post(
  "/v1/user/userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id: string = req.body.userId;
      const db = await getDatabase();
      const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
      const sendData = {
        _id: user?._id,
        name: user?.name,
        image: user?.image,
        email: user?.email,
        headline: user?.headline,
      };
      res.json(sendData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error retrieving user" });
    }
  }
);

userRouter.post(
  "/v1/user/email",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const email = req.body.email;
      const db = await getDatabase();
      const user = await db.collection("users").findOne({ email: email });
      const sendData = {
        _id: user?._id,
        name: user?.name,
        image: user?.image,
        email: user?.email,
        headline: user?.headline,
      };
      res.json(sendData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error retrieving user" });
    }
  }
);

userRouter.post(
  "/v1/user/profile/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const sessionData = req.body;

      const session = await db
        .collection("session")
        .findOne({ sessionId: sessionData.sessionId });

      if (!session) {
        res.status(404).send("session not found.");
        return;
      }

      const userData = await db
        .collection("users")
        .findOne({ _id: session.userId });

      if (!userData) {
        res.status(404).send("user not found.");
        return;
      }

      res.status(200).json({
        ...userData,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error.");
    }
  }
);

userRouter.post(
  "/v1/user/update/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const userId: string = req.body.userId;
      const updateData: object = req.body.updateData;
      
      const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
      res
      .status(result.acknowledged ? 200 : 404)
      .send(result.acknowledged ? "User updated" : "User update failed");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error updating user");
    }
  }
);

userRouter.post(
  "/v1/user/delete/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
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
  "/v1/user/update-pwd/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const userId: string = req.body.userId;
      const updatePwd: string = req.body.updatePwd;

      const updateData = {
        pwd: updatePwd,
        hashed: bcrypt.hashSync(updatePwd, bcrypt.genSaltSync(10)),
      };
      const result = await db
        .collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
      res
        .status(result.acknowledged ? 200 : 404)
        .send(
          result.acknowledged ? "Password updated" : "Password update failed"
        );
    } catch (error) {
      console.error(error);
      res.status(500).send("Error updating password");
    }
  }
);

userRouter.post(
  "/v1/user/uploadImage/",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const file = req.file;

      if (!file) {
        res.status(400).send("No file uploaded");
        return;
      }

      const bucket = new GridFSBucket(db);
      const uploadStream = bucket.openUploadStream(file.originalname);

      const readableStream = Readable.from(file.buffer);

      readableStream.pipe(uploadStream);

      uploadStream.on("finish", () => {
        res.status(200).send("File uploaded successfully.");
      });

      uploadStream.on("error", (error) => {
        console.error(error);
        res.status(500).send("Error uploading file");
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file");
    }
  }
);

userRouter.get(
  "/v1/user/image/:filename",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDatabase();
      const filename = req.params.filename;

      const bucket = new GridFSBucket(db);
      const downloadStream = bucket.openDownloadStreamByName(filename);

      downloadStream.on("error", () => {
        res.status(404).send("Image not found");
      });

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000");

      downloadStream.pipe(res);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error retrieving image");
    }
  }
);

export default userRouter;
