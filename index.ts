import express, { Application, Request, Response } from "express";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import routes from "./src/routes/routes";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Application = express();
const server: HTTPServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://47.128.231.167",
      "http://localhost:3000",
      "https://wiredtalk-backend.vercel.app/",
    ],
    methods: ["GET", "POST"],
    credentials: true
  })
);

const io = new SocketIOServer(server, {
  cors: {
    origin: [
      "http://47.128.231.167",
      "http://localhost:3000",
      "https://wiredtalk-backend.vercel.app/",
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.get("/", (req: Request, res: Response): void => {
  res.send("Hello World! from server.");
});
app.use("/api", routes);

const PORT: string | number = process.env.PORT || 5000;
server.listen(PORT, (): void => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

io.on("connection", (socket: Socket) => {
  socket.on("calling", (data) => {
    socket.broadcast.emit("calling", data);
  });

  socket.on("ringing", (data) => {
    socket.broadcast.emit("ringing", data);
  });

  socket.on("accepting", (data) => {
    socket.broadcast.emit("accepting", data);
  });

  socket.on("declined", (data) => {
    socket.broadcast.emit("declined", data);
  });

  socket.on("offer", (offer) => {
    console.log("Broadcasting offer.");
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    console.log("Broadcasting answer.");
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    console.log("Broadcasting ICE candidate.");
    socket.broadcast.emit("ice-candidate", candidate);
  });
});
