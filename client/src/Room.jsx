/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "./socker";
import { Device } from "mediasoup-client";
import { useParams } from "react-router";
import { producerParams } from "./producerParams";
import { useQuery } from "react-query";
import { getRooms } from "./Home";
import { RoomOverview } from "./components/RoomOverview";
import { Link } from "react-router-dom";

let device = new Device();
let producerTransport;
let producer;
let consumerTransport;
let socketId = socket.id;

function Room() {
  const [isConnected, setIsConnected] = useState(false);
  const producerRef = useRef(null);
  const { roomId } = useParams();
  const [consumers, setConsumers] = useState([]);
  const { data: rooms, refetch } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms(),
    refetchIntervalInBackground: 20000,
  });

  const sendTransport = useCallback(() => {
    socket.emit(
      "createWebRtcTransport",
      { sender: true, roomId, myId: socketId },
      ({ params }) => {
        if (params.error) return;

        producerTransport = device.createSendTransport(params);

        producerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit("transport-connect", {
                dtlsParameters,
                roomId,
                myId: socketId,
              });

              callback();
            } catch (error) {
              errback(error);
            }
          }
        );

        producerTransport.on(
          "produce",
          async (parameters, callback, errback) => {
            try {
              socket.emit(
                "transport-produce",
                {
                  kind: parameters.kind,
                  rtpParameters: parameters.rtpParameters,
                  appData: parameters.appData,
                  roomId: roomId,
                  myId: socketId,
                },
                ({ id }) => {
                  callback({ id });
                }
              );
            } catch (error) {
              console.log(error);
              errback(error);
            }
          }
        );

        onConnectTransport();
      }
    );
  }, [roomId]);

  const connectRecvTransport = useCallback(
    async (producerId) => {
      socket.emit(
        "consume",
        {
          rtpCapabilities: device.rtpCapabilities,
          roomId,
          producerId,
          myId: socketId,
        },
        async ({ params }) => {
          if (params.error) {
            return;
          }

          const consumer = await consumerTransport.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters,
          });

          setConsumers((prev) => [...prev, { consumer, producerId }]);
        }
      );
    },
    [roomId]
  );

  const getTracks = useCallback(() => {
    socket.emit("recv-tracks", { roomId, socketId: socketId }, async (data) => {
      const { producers } = data;
      for (let i = 0; i < producers.length; i++) {
        const producer = producers[i];
        await connectRecvTransport(producer);
      }
    });
  }, [connectRecvTransport, roomId]);

  const createRecvTransport = useCallback(async () => {
    socket.emit(
      "createWebRtcTransport",
      { sender: false, roomId, myId: socketId },
      ({ params }) => {
        if (params.error) {
          return;
        }

        consumerTransport = device.createRecvTransport(params);

        getTracks();

        consumerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit("transport-recv-connect", {
                dtlsParameters,
                roomId,
                myId: socketId,
              });

              callback();
            } catch (error) {
              errback(error);
            }
          }
        );
      }
    );
  }, [roomId, getTracks]);

  const joinRoom = useCallback(() => {
    socketId = socket.id;
    socket.emit("joinned-room", { roomId: roomId, myId: socketId }, () => {
      refetch();
      socket.emit("getRtpCapabilities", { roomId }, async (data) => {
        try {
          await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        } catch (e) {
          console.log(e);
        }
        sendTransport();
        createRecvTransport();
      });
    });
  }, [createRecvTransport, refetch, roomId, sendTransport]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
      socket.on("connect", () => {
        setIsConnected(true);
      });
    } else {
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      joinRoom();
    }
  }, [isConnected, joinRoom]);

  useEffect(() => {
    socket.on("new-producer", ({ producerId }) => {
      connectRecvTransport(producerId);
    });

    socket.on("remove-user", ({ producerId }) => {
      setConsumers((prev) => prev.filter((i) => i.producerId !== producerId));
    });
  }, [connectRecvTransport]);

  const onBeforeUnload = (ev) => {
    ev.preventDefault();
    return (ev.returnValue = "Are you sure you want to close?");
  };

  const onUnload = useCallback(
    (ev) => {
      ev.preventDefault();
      socket.emit("user-disconnected", { roomId, myId: socketId });
    },
    [roomId]
  );

  useEffect(() => {
    return () => {
      socket.emit("user-disconnected", { roomId, myId: socketId });
    };
  }, [roomId]);

  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("unload", onUnload);
    return () => {
      window.removeEventListener("unload", onUnload);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [roomId, onUnload]);

  const onConnectTransport = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const videoTrack = stream.getVideoTracks()[0];

    producerRef.current.srcObject = stream;

    producer = await producerTransport.produce({
      ...producerParams,
      track: videoTrack,
    });

    producer.on("trackended", () => {
      console.log("track ended");
    });

    producer.on("transportclose", () => {
      console.log("transport ended");
    });
  };

  return (
    <div className="flex justify-between">
      <div className="w-full">
        <div className="flex justify-around p-4">
          {consumers.map((obj) => (
            <RenderVideo
              consumer={obj.consumer}
              key={obj?.producerId}
              roomId={roomId}
            />
          ))}
        </div>
        <div className="absolute bottom-0 border-slate-900 border-[5px] rounded-md">
          <video
            ref={producerRef}
            muted
            autoPlay
            style={{ width: "250px" }}
          ></video>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 shadow-2xl p-5 min-h-screen">
        <Link to={"/"}>
          <div className="bg-slate-800 px-3 py-2 rounded-md self-end">
            Go Home
          </div>
        </Link>
        {rooms?.map((room) => (
          <RoomOverview key={room.roomId} room={room} />
        ))}
      </div>
      {/* <div>
        <button onClick={() => producerTransport.close()}>
          Close Producer Transport
        </button>
      </div> */}
    </div>
  );
}

const RenderVideo = ({ consumer, roomId, socketId }) => {
  const videoRef = useRef(null);
  const { track } = consumer;
  useEffect(() => {
    videoRef.current.srcObject = new MediaStream([track]);
    socket.emit("consumer-resume", {
      consumerId: consumer?.id,
      socketId: socketId,
      roomId: roomId,
    });
  }, [roomId, track, consumer, socketId]);
  return (
    <video
      className="border-black border-2 rounded-md"
      ref={videoRef}
      autoPlay
      muted={false}
      style={{ width: "300px" }}
    ></video>
  );
};

export default Room;
