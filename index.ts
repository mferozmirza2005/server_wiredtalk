import express, { Application, Request, Response } from "express";
import routes from "./src/routes/routes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        "http://47.129.236.26",
        "http://localhost:3000"
    ],
}));

app.get("/", (req: Request, res: Response): void => {
    res.send("Hello World! from server.");
});
app.use("/api", routes);

const PORT: string | number = process.env.PORT || 5000;
app.listen(PORT, (): void => {
    console.log(`http://localhost:${PORT}/`);
});
