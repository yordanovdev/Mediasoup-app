const mediaCodecs = require("../mediacodecs");
const { rooms } = require("../rooms");

const configureMediasoupSocket = (socket, worker) => {
  socket.on("joinned-room", async ({ roomId, myId }, callback) => {
    socket.join(roomId);

    const room = rooms[roomId] || {};
    if (!rooms[roomId]) {
      room.router = await worker.createRouter({ mediaCodecs });
      room.worker = worker;
      room.state = {
        [myId]: {
          consumers: [],
          producer: null,
          producerTransport: null,
          consumerTransport: null,
        },
      };
    } else {
      room.state[myId] = {
        consumers: [],
        producer: null,
        producerTransport: null,
        consumerTransport: null,
      };
    }
    rooms[roomId] = room;
    callback();
  });

  socket.on("getRtpCapabilities", ({ roomId }, callback) => {
    const rtpCapabilities = rooms[roomId].router.rtpCapabilities;
    callback({ rtpCapabilities });
  });

  socket.on("transport-connect", async ({ dtlsParameters, roomId, myId }) => {
    rooms[roomId]?.state[myId].producerTransport?.connect({ dtlsParameters });
  });

  socket.on("user-disconnected", async ({ roomId, myId }) => {
    if (roomId && socket.id) {
      let room = rooms[roomId];
      if (!room) return;
      socket.to(roomId).emit("remove-user", {
        producerId: room?.state[myId]?.producer?.id,
      });
      room.state[myId]?.producer?.close();
      room.state[myId]?.producerTransport?.close();
      room.state[myId]?.consumerTransport?.close();
      const consumers = room.state[myId]?.consumers || [];
      for (const consumer of consumers) {
        consumer.close();
      }
      delete room.state[myId];

      if (Object.keys(room.state).length === 0) {
        room.router.close();
        delete rooms[roomId];
      }
    }
  });

  socket.on(
    "createWebRtcTransport",
    async ({ sender, myId, roomId }, callback) => {
      if (sender) {
        rooms[roomId].state[myId].producerTransport =
          await createWebRtcTransport(callback, roomId);
      } else {
        rooms[roomId].state[myId].consumerTransport =
          await createWebRtcTransport(callback, roomId);
      }
    }
  );

  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, roomId, myId }, callback) => {
      const producer = await rooms[roomId].state[
        myId
      ].producerTransport.produce({
        kind,
        rtpParameters,
      });

      rooms[roomId].state[myId].producer = producer;

      producer.on("transportclose", () => {
        producer.close();
      });

      socket
        .to(roomId)
        .emit("new-producer", { producerId: producer.id, socketId: socket.id });

      callback({
        id: producer.id,
      });
    }
  );

  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, roomId, myId }) => {
      await rooms[roomId]?.state[myId].consumerTransport.connect({
        dtlsParameters,
      });
    }
  );

  socket.on("recv-tracks", async ({ roomId, socketId }, callback) => {
    if (!rooms[roomId].state[socketId]?.consumerTransport) {
      return;
    }

    const { state } = rooms[roomId];
    const transport = state[socketId].consumerTransport;
    if (!transport) return;

    const response = [];

    for (const theirPeerId of Object.keys(state)) {
      const peerState = state[theirPeerId];
      if (theirPeerId === socketId || !peerState || !peerState.producer) {
        continue;
      }
      response.push(peerState.producer.id);
    }

    callback({ producers: response });
  });

  socket.on(
    "consume",
    async ({ rtpCapabilities, roomId, myId, producerId }, callback) => {
      if (!rooms[roomId]) return;

      try {
        if (
          rooms[roomId].router.canConsume({
            producerId: producerId,
            rtpCapabilities,
          })
        ) {
          const consumer = await rooms[roomId].state[
            myId
          ].consumerTransport.consume({
            producerId: producerId,
            rtpCapabilities,
            paused: true,
          });

          rooms[roomId].state[myId].consumers.push(consumer);

          consumer.on("transportclose", () => {
            consumer.close();
            console.log("transport close from consumer");
          });

          consumer.on("producerclose", () => {
            consumer.close();
            console.log("producer of consumer closed");
          });

          const params = {
            id: consumer.id,
            producerId: producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          };

          callback({ params });
        }
      } catch (error) {
        console.log(error.message);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  socket.on("consumer-resume", async ({ consumerId, socketId, roomId }) => {
    const consumers = rooms[roomId]?.state[socket.id]?.consumers || [];

    for (let i = 0; i < consumers.length; i++) {
      if (consumers[i].id === consumerId) {
        await consumers[i].resume();
      }
    }
  });
};

const createWebRtcTransport = async (callback, roomId) => {
  try {
    const webRtcTransport_options = {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: "127.0.0.1",
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };

    const router = rooms[roomId].router;
    let transport = await router.createWebRtcTransport(webRtcTransport_options);

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") {
        transport.close();
      }
    });

    transport.on("close", () => {
      console.log("transport closed");
    });

    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      },
    });

    return transport;
  } catch (error) {
    console.log(error);
    callback({
      params: {
        error: error,
      },
    });
  }
};

module.exports = { configureMediasoupSocket };
