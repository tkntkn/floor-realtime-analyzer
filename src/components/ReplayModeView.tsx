import { Recording } from "../domains/recording";
import { FloorImage } from "./FloorImage";
import { AiOutlineRollback } from "react-icons/ai";

export function ReplayModeView(props: { recording: Recording; switchMode: () => void }) {
  return (
    <div className="ReplayModeView w-full">
      <div className="text-lg m-2.5 border-b-2 border-gray-800 flex items-center justify-between">
        <h2>Replay Mode</h2>
        <button onClick={props.switchMode} className="text-sm flex items-center">
          <AiOutlineRollback />
          <span className="ml-1">Switch to Realtime Mode</span>
        </button>
      </div>
      <div className="flex justify-evenly m-2 p-2 rounded-lg bg-gray-200">Controller: todo...</div>
      <div className="p-2 grid grid-cols-3 gap-3">
        {props.recording.videos.map(({ device, blob }) => (
          <div key={device.deviceId} className="border border-gray-800 col-span-1">
            <div className="flex justify-between">
              <span className="font-bold">Device Label: {device.label}</span>
            </div>
            <video autoPlay ref={(element) => element && (element.src = URL.createObjectURL(blob))} className="w-1/2"></video>
            <span>{device.label}</span>
          </div>
        ))}
        {props.recording.floors.map(({ url, data }) => (
          <div key={url} className="border border-gray-800 col-span-1 overflow-hidden">
            <div className="flex justify-between">
              <span className="font-bold">URL: {url}</span>
            </div>
            <FloorImage data={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
