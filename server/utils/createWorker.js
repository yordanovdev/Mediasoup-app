const mediasoup = require("mediasoup");

const createWorker = async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 8000,
    rtcMaxPort: 8020,
  });

  console.log("Worker has been created: " + worker.pid);

  worker.on("died", () => {
    console.log("Worker has died!!!");
    process.exit(1);
  });

  return worker;
};

module.exports = createWorker;
