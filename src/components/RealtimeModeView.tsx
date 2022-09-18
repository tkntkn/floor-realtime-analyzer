import { ChangeEvent, useCallback, useEffect, useState } from "react";
import cn from "classnames";
import { recordStreams } from "../utils/MediaRecorderHelper";
import { Recording } from "../domains/recording";
import { useStartResume } from "../utils/hooks";
import { shortZip } from "../utils/ArrayHelper";
import { FloorImage } from "./FloorImage";
import { recordSockets } from "../domains/floor";

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
    <div className={cn("RealtimeModeView", { "is-recordinging": isRecording })}>
      <h2>Realtime Mode</h2>
      <h3>Controller</h3>
      <h4>Record</h4>
      <button onClick={startRecord}>Record</button>
      <button onClick={triggerStopRecord}>Stop</button>
      <h4>Add Source</h4>
      <div>
        <select className="RealtimeModeView-videoSourceDeviceSelect" value={selectedVideoDevice?.deviceId} onChange={handleVideoDeviceSelectChange}>
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
        <button className="RealtimeModeView-videoSourceDeviceSelectAdd" onClick={handleAddVideoSourceClick}>
          Add Video Source
        </button>
      </div>
      <div>
        <input type="text" placeholder="ws://localhost:8080/" value={floorSourceUrl} onChange={(event) => setFloorSourceUrl(event.currentTarget.value)} />
        <button onClick={handleAddFloorSourceClick}>Add Floor Source</button>
      </div>
      <h2>Viewer</h2>
      <div>
        {videoSources.map((source) => (
          <div key={source.device.deviceId}>
            <button onClick={() => removeVideoSource(source)}>Remove</button>
            <video autoPlay ref={(element) => element && (element.srcObject = source.stream)} style={{ width: 100 }}></video>
            <span>{source.device.label}</span>
          </div>
        ))}
      </div>
      <div>
        {floorSources.map((source, index) => (
          <div key={index}>
            <button onClick={() => removeFloorSource(source)}>Remove</button>
            <FloorImage socket={source.socket} />
            <span>{source.socket.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
