
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static("public"));
const rooms = new Map();

const games = ["quiz", "billiards", "konkani"];

app.get("/", (req, res) => {
  res.send("پاڵەوانانی زانیاری کوردی 🎮");
});

app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("create-room", ({ game, maxPlayers = 2, name }) => {
    if (!games.includes(game)) {
      return socket.emit("error-message", "جۆری یاری هەڵەیە");
    }

    if (![2, 3, 4].includes(maxPlayers)) {
      return socket.emit("error-message", "ژمارەی یاریزان هەڵەیە");
    }

    const roomId = crypto.randomBytes(3).toString("hex");

    const room = {
      id: roomId,
      game,
      maxPlayers,
      players: [],
      scores: {}
    };

    rooms.set(roomId, room);
    joinRoom(socket, room, name || "یاریزان");
  });

  socket.on("join-room", ({ roomId, name }) => {
    const room = rooms.get(roomId);

    if (!room) {
      return socket.emit("error-message", "ژوورەکە نەدۆزرایەوە");
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit("error-message", "ژوورەکە پڕە");
    }

    joinRoom(socket, room, name || "یاریزان");
  });

  socket.on("chat", (message) => {
    const room = findRoom(socket.id);
    if (!room || typeof message !== "string") return;

    io.to(room.id).emit("chat", {
      player: socket.id,
      message: message.slice(0, 300)
    });
  });

  socket.on("answer", ({ correct }) => {
    const room = findRoom(socket.id);
    if (!room || room.game !== "quiz") return;

    if (correct === true) {
      room.scores[socket.id] =
        (room.scores[socket.id] || 0) + 1;

      io.to(room.id).emit("score", room.scores);
    }
  });

  socket.on("disconnect", () => {
    for (const [id, room] of rooms) {
      room.players = room.players.filter(
        player => player.id !== socket.id
      );

      if (room.players.length === 0) {
        rooms.delete(id);
      } else {
        io.to(id).emit("players-update", room.players);
      }
    }

    console.log("Player disconnected:", socket.id);
  });
});

function joinRoom(socket, room, name) {
  socket.join(room.id);

  room.players.push({
    id: socket.id,
    name
  });

  room.scores[socket.id] = 0;

  socket.emit("room-joined", {
    roomId: room.id,
    game: room.game,
    players: room.players,
    maxPlayers: room.maxPlayers
  });

  io.to(room.id).emit("players-update", room.players);
}

function findRoom(playerId) {
  for (const room of rooms.values()) {
    if (room.players.some(player => player.id === playerId)) {
      return room;
    }
  }
  return null;
}

server.listen(process.env.PORT || 3000, () => {
  console.log("Game server is running");
});
