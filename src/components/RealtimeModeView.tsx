import { ChangeEvent, useCallback, useEffect, useState } from "react";
import cn from "classnames";
import { recordStreams } from "../utils/MediaRecorderHelper";
import { Recording } from "../domains/recording";
import { useStartResume } from "../utils/hooks";
import { shortZip } from "../utils/ArrayHelper";

type VideoSource = { device: MediaDeviceInfo; stream: MediaStream };

function useVideoDeviceListSelector() {
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

  return [availableVideoDevices, addVideoSource, removeVideoSource, videoSources] as const;
}

export function RealtimeModeView(props: { onRecordingEnd(recording: Recording): void }) {
  const [availableVideoDevices, addVideoSource, removeVideoSource, videoSources] = useVideoDeviceListSelector();
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<MediaDeviceInfo>();
  const handleAddSelectedVideoDeviceClick = useCallback(async () => {
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

  const [isRecording, startRecord, triggerStopRecord] = useStartResume(async (triggeredStopRecord) => {
    const title = new Date().toISOString();
    const streams = videoSources.map(({ stream }) => stream);
    const stopAndGetBlobs = recordStreams(streams, "video/webm");
    await triggeredStopRecord;
    const blobs = await stopAndGetBlobs();
    const videos = shortZip(videoSources, blobs).map(([{ device }, blob]) => ({ device, blob }));
    props.onRecordingEnd({ title, videos });
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
        <button className="RealtimeModeView-videoSourceDeviceSelectAdd" onClick={handleAddSelectedVideoDeviceClick}>
          Add Video Source
        </button>
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
      <div className="RealtimeModeView-dataList"></div>
    </div>
  );
}
