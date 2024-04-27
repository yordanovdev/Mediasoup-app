import { io } from "socket.io-client";

const URL = "wss://localhost:3000/mediasoup";

export const socket = io(URL, {
  autoConnect: false,
});
