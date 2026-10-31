const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send("پاڵەوانانی زانیاری کوردی 🎮");
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("chat", (message) => {
    io.emit("chat", message);
  });

  socket.on("answer", (correct) => {
    if (correct) {
      io.emit("score", socket.id);
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Game server is running");
});