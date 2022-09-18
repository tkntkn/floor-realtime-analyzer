import { useEffect, useState } from "react";
import "./FloorImage.css";
import { type FloorImageData, parseFloorImage } from "../domains/floor";

export function FloorImage(props: { socket: WebSocket } | { socket?: undefined; data: FloorImageData[] }) {
  const [floor, setFloor] = useState<FloorImageData>();
  useEffect(() => {
    if (props.socket) {
      const ac = new AbortController();
      props.socket.addEventListener(
        "message",
        (event) => {
          const floor = parseFloorImage(event.data as string);
          setFloor(floor);
        },
        ac
      );
      return () => ac.abort();
    } else {
      const worker = new Worker(new URL("../domains/FloorWorker.ts", import.meta.url));
      worker.postMessage(props.data);
      worker.addEventListener("message", (event) => {
        setFloor(event.data as FloorImageData);
      });
      return () => worker.terminate();
    }
  }, []);

  return (
    <div className="FloorImage">
      {floor ? (
        <>
          {floor.rows.map((row, index) => (
            <div key={index} className="FloorImage_row">
              {row.map((cell, index) => (
                <div key={index} className="FloorImage_cell" style={{ backgroundColor: `rgba(0,0,0,${cell / 1000})` }}></div>
              ))}
            </div>
          ))}
          <p className="FloorImage_string">{floor.string}</p>
        </>
      ) : (
        <p>No Data</p>
      )}
    </div>
  );
}
