const express = require("express");
const { rooms } = require("./rooms");
const app = express();
const fs = require("fs");

const options = {
  key: fs.readFileSync("./ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("./ssl/cert.pem", "utf-8"),
};

const https = require("httpolyglot");
const server = https.createServer(options, app);

const { Server } = require("socket.io");
const createWorker = require("./utils/createWorker");
const { configureMediasoupSocket } = require("./utils/mediasoup_socket");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const peers = io.of("/mediasoup");

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/rooms", (req, res) => {
  const roomKeys = Object.keys(rooms);
  const response = roomKeys.map((key) => {
    return {
      roomId: key,
      length: Object.keys(rooms[key].state || {}).length,
    };
  });

  res.json(response);
});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

let worker;

let worker_res = createWorker();
worker_res.then((wrk) => {
  worker = wrk;
});

peers.on("connection", async (socket) => {
  configureMediasoupSocket(socket, worker);
});
