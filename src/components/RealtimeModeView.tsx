import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { recordStreams } from "../utils/MediaRecorderHelper";
import { Recording } from "../domains/recording";
import { useStartResume } from "../utils/hooks";
import { shortZip } from "../utils/ArrayHelper";
import { FloorImage } from "./FloorImage";
import { recordSockets } from "../domains/floor";
import { AiOutlinePlusCircle, AiOutlineClose } from "react-icons/ai";
import { BsFillRecordFill, BsFillStopFill } from "react-icons/bs";
import classNames from "classnames";

type VideoSource = { device: MediaDeviceInfo; stream: MediaStream };
function useVideoSourceController() {
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);

  useEffect(() => {
    (async () => {
      await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    })();
    return () => videoSources.forEach((source) => source.stream.getTracks().forEach((track) => track.stop()));
  }, []);

  const addVideoSource = useCallback(async (device: MediaDeviceInfo) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: device.deviceId } } });
    setVideoSources((sources) => [...sources, { device, stream }]);
  }, []);

  const removeVideoSource = useCallback((source: VideoSource) => {
    source.stream.getTracks().forEach((track) => track.stop());
    setVideoSources((sources) => sources.filter((s) => s.device.deviceId !== source.device.deviceId));
  }, []);

  return [availableVideoDevices, videoSources, addVideoSource, removeVideoSource] as const;
}

type FloorSource = { socket: WebSocket };
function useFloorSourceController() {
  const [floorSources, setFloorSources] = useState<FloorSource[]>([]);

  useEffect(() => {
    return () => floorSources.forEach((source) => source.socket.close());
  }, []);

  const addFloorSource = useCallback((url: string) => {
    if (floorSources.some((source) => source.socket.url === url)) {
      return;
    }
    try {
      const socket = new WebSocket(url);
      setFloorSources((sources) => [...sources, { socket }]);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const removeFloorSource = useCallback((source: FloorSource) => {
    source.socket.close();
    setFloorSources((sources) => sources.filter((s) => s.socket.url !== source.socket.url));
  }, []);

  return [floorSources, addFloorSource, removeFloorSource] as const;
}

export function RealtimeModeView(props: { onRecordingEnd(recording: Recording): void }) {
  const [availableVideoDevices, videoSources, addVideoSource, removeVideoSource] = useVideoSourceController();
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<MediaDeviceInfo>();
  const handleAddVideoSourceClick = useCallback(async () => {
    if (selectedVideoDevice) {
      addVideoSource(selectedVideoDevice);
    }
  }, [selectedVideoDevice]);
  const handleVideoDeviceSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const device = availableVideoDevices.find((device) => device.deviceId === event.currentTarget.value);
      setSelectedVideoDevice(device);
    },
    [availableVideoDevices]
  );

  const [floorSources, addFloorSource, removeFloorSource] = useFloorSourceController();
  const [floorSourceUrl, setFloorSourceUrl] = useState<string>("");
  const handleAddFloorSourceClick = useCallback(() => {
    addFloorSource(floorSourceUrl);
  }, [floorSourceUrl]);

  const [isRecording, startRecord, triggerStopRecord] = useStartResume(async (triggeredStopRecord) => {
    const title = new Date().toISOString();
    const stopAndGetBlobs = recordStreams(
      videoSources.map(({ stream }) => stream),
      "video/webm"
    );
    const stopAndGetDataList = recordSockets(floorSources.map(({ socket }) => socket));
    await triggeredStopRecord;
    const blobs = await stopAndGetBlobs();
    const dataList = await stopAndGetDataList();
    const videos = shortZip(videoSources, blobs).map(([{ device }, blob]) => ({ device, blob }));
    const floors = shortZip(floorSources, dataList).map(
      ([
        {
          socket: { url },
        },
        data,
      ]) => ({ url, data })
    );
    props.onRecordingEnd({ title, videos, floors });
  });

  return (
    <div className="RealtimeModeView">
      <div className="text-lg m-2.5 border-b-2 border-gray-800 flex items-center justify-between">
        <h2>Realtime Mode</h2>
      </div>
      <div className={classNames("flex justify-evenly m-2 p-2 rounded-lg", { "bg-red-100": isRecording, "bg-blue-100": !isRecording })}>
        <span>
          {isRecording ? (
            <button onClick={triggerStopRecord} className="flex items-center">
              <span>Stop Recording: </span>
              <span className="text-2xl text-blue-500">
                <BsFillStopFill />
              </span>
            </button>
          ) : (
            <button onClick={startRecord} className="flex items-center">
              <span>Start Recording: </span>
              <span className="text-2xl text-red-500">
                <BsFillRecordFill />
              </span>
            </button>
          )}
        </span>
        <hr className="inline-block w-px bg-blue-900" />
        <details>
          <summary className="relative z-10 flex items-center">
            <AiOutlinePlusCircle className="text-base" />
            <span className="ml-1">Add Source</span>
          </summary>
          <div className="absolute rounded-md border-gray-800 border pt-8 p-3 -translate-x-2 -translate-y-7 bg-gray-200">
            <h3 className="font-bold mb-1">Video Source</h3>
            <div>
              <select className="RealtimeModeView-videoSourceDeviceSelect w-60 border border-gray-800 px-1 rounded-md" value={selectedVideoDevice?.deviceId} onChange={handleVideoDeviceSelectChange}>
                <option value={undefined}></option>
                {availableVideoDevices.map((device) => {
                  if (videoSources.some((source) => source.device.deviceId === device.deviceId)) {
                    return null;
                  } else {
                    return (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    );
                  }
                })}
              </select>
              <button className="RealtimeModeView-videoSourceDeviceSelectAdd font-thin ml-3 border border-gray-800 px-3 rounded-md shrink-0 bg-gray-800 text-white" onClick={handleAddVideoSourceClick}>
                Add
              </button>
            </div>
            <h3 className="font-bold mt-2 mb-1">Floor Source</h3>
            <div>
              <input type="text" className="w-60 border border-gray-800 px-2 rounded-md" placeholder="ws://localhost:8080/" value={floorSourceUrl} onChange={(event) => setFloorSourceUrl(event.currentTarget.value)} />
              <button onClick={handleAddFloorSourceClick} className="font-thin ml-3 border border-gray-800 px-3 rounded-md shrink-0 bg-gray-800 text-white">
                Add
              </button>
            </div>
          </div>
        </details>
      </div>
      <div className="p-2 grid grid-cols-3 gap-3">
        {videoSources.map((source) => (
          <div key={source.device.deviceId} className="border border-gray-800 col-span-1">
            <div className="flex justify-between">
              <span className="font-bold">Device Label: {source.device.label}</span>
              <button onClick={() => removeVideoSource(source)}>
                <AiOutlineClose />
              </button>
            </div>
            <video autoPlay ref={(element) => element && (element.srcObject = source.stream)} className="w-1/2"></video>
          </div>
        ))}
        {floorSources.map((source) => (
          <div key={source.socket.url} className="border border-gray-800 col-span-1 overflow-hidden">
            <div className="flex justify-between">
              <span className="font-bold">URL: {source.socket.url}</span>
              <button onClick={() => removeFloorSource(source)}>
                <AiOutlineClose />
              </button>
            </div>
            <FloorImage socket={source.socket} />
          </div>
        ))}
      </div>
    </div>
  );
}
