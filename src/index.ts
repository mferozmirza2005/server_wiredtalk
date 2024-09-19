import express, { Application, Request, Response } from "express";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import routes from "./routes/routes";
import webPush from "web-push";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Application = express();
const vapidkeys = webPush.generateVAPIDKeys();
let subscriptions: any[] = [];

webPush.setVapidDetails(
  'mailto:m.ferozmirza2005@gmail.com',
  vapidkeys.publicKey,
  vapidkeys.privateKey
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

const server: HTTPServer = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req: Request, res: Response): void => {
  res.send("Hello World! from server.");
});

app.get("/vapidkeys", (req: Request, res: Response) => {
  res.status(200).json({ keys: vapidkeys });
});

app.post('/api/subscribe', (req: Request, res: Response) => {
  const subscriptionData = req.body;
  let exist = false;
  subscriptions.map((subscribData)=>{
    if(subscriptionData.userId === subscribData.userId) {
      subscribData.subscription = subscriptionData.subscription;
      exist = true;
    }
  })
  if (exist === false) {
    subscriptions.push(subscriptionData);
  }
  res.status(200).json({ message: 'Subscription received' });
});

app.post('/api/sendNotification', (req, res) => {
  const { 
    _id,
    title,
    body,
    type,
    icon,
    badge 
  } = req.body;

  const notificationPayload = {
    title,
    body,
    type,
    icon,
    badge
  };

  Promise.all(subscriptions.map(subscriptionData => {
    if(_id === subscriptionData.userId) {
      return webPush.sendNotification(subscriptionData.subscription, JSON.stringify(notificationPayload));
    }
  }))
    .then(() => {
      res.status(200).json({ message: 'Notification sent successfully' });
    })
    .catch((error) => {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Error sending notification' });
    });
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

  socket.on("receiver-busy", (data) => {
    socket.broadcast.emit("receiver-busy", data);
  });

  socket.on("change-event", (data) => {
    socket.broadcast.emit("change-event", data);
  });

  socket.on("recording", (data) => {
    io.emit("recording", data);
  });

  socket.on("one-to-one-message", (data) => {
    io.emit("one-to-one-message", data);
  });

  socket.on("one-to-one-delete", (data) => {
    io.emit("one-to-one-delete", data);
  });

  socket.on("one-to-one-edited", (data) => {
    io.emit("one-to-one-edited", data);
  });

  socket.on("message-read", (data) => {
    io.emit("message-read", data);
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
