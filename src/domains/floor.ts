export interface FloorImageData {
  string: string;
  time: number;
  rows: number[][];
}

export function parseFloorImage(string: string) {
  const [timeString, values] = string.split(":");
  const time = parseInt(timeString);
  const rows = values.split(";").map((row) => row.split(",").map((cell) => parseInt(cell)));
  return { string, time, rows };
}

function recordSocket(socket: WebSocket) {
  const floorImages: FloorImageData[] = [];
  const ac = new AbortController();
  socket.addEventListener(
    "message",
    (event) => {
      floorImages.push(parseFloorImage(event.data));
    },
    ac
  );
  return function stopAndGetData() {
    ac.abort();
    return floorImages;
  };
}

export function recordSockets(sockets: WebSocket[]) {
  const recordings = sockets.map((socket) => recordSocket(socket));
  return function stopAndGetDataList() {
    return recordings.map((stopAndGetData) => stopAndGetData());
  };
}
