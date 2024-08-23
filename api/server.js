import { Server } from "socket.io";

module.exports = (req, res) => {
  const io = new Server(res.socket.server);

  io.on("connection", (socket) => {
    console.log("a user connected");
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

    if (!res.socket.server.io) {
      console.log("Setting up socket.io");
      res.socket.server.io = io;
    }
  });

  res.status(200).send("WebSocket server is running");
};
