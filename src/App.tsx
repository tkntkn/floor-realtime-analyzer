import { ChangeEvent, useCallback, useEffect, useState } from "react";
import cn from "classnames";
import "./App.css";
import JSZip from "jszip";

interface Floor {
  raw: string;
  time: number;
  rows: number[][];
}

class Deferred<T> {
  public promise: Promise<T>;
  public resolve!: (value: T | PromiseLike<T>) => void;
  public reject!: (reason?: any) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

async function* iterRecording(recorder: MediaRecorder) {
  recorder.start();
  const stopPromise = new Promise<void>((resolve) => {
    recorder.addEventListener(
      "stop",
      () => {
        resolve();
      },
      { once: true }
    );
  });
  while (true) {
    const dataPromise = new Promise<Blob>((resolve) => {
      recorder.addEventListener(
        "dataavailable",
        (event) => {
          resolve(event.data);
        },
        { once: true }
      );
    });
    const raced = await Promise.race([stopPromise, dataPromise]);
    if (raced) {
      yield dataPromise;
    } else {
      return;
    }
  }
}

type Record = {
  title: string;
  videos: Array<{
    device: MediaDeviceInfo;
    blob: Blob;
  }>;
};

async function loadRecord(file: File): Promise<Record> {
  const zip = await JSZip.loadAsync(file.arrayBuffer());
  const record: Record = JSON.parse(await zip.file("record.json")!.async("string"));
  const loadBlob = record.videos.map(async (video, index) => {
    video.blob = await zip.file(new RegExp(`^${index}-.*\.webm$`))[0].async("blob");
  });
  await Promise.all(loadBlob);
  return record;
}

async function saveRecord(record: Record) {
  const zip = new JSZip();
  zip.file(
    "record.json",
    JSON.stringify({
      title: record.title,
      videos: record.videos.map(({ device }) => ({ device })),
    })
  );
  record.videos.forEach((video, index) => {
    zip.file(`${index}-${video.device.label.replace(/[\.:]/g, "_")}.webm`, video.blob, { binary: true });
  });
  const file = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${record.title.replace(/[\.:]/g, "_")}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

export function RealtimeModeView(props: { onRecordEnd(record: Record): void }) {
  const [videoSourceDevices, setVideoSourceDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    (async () => {
      await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setVideoSourceDevices(videoDevices);
    })();
  }, []);

  const [selectedVideoSourceDevice, setSelectedVideoSourceDevice] = useState<MediaDeviceInfo>();
  const handleVideoSourceDeviceSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const device = videoSourceDevices.find((device) => device.deviceId === event.target.value);
      setSelectedVideoSourceDevice(device);
    },
    [videoSourceDevices]
  );

  type VideoSource = { device: MediaDeviceInfo; stream: MediaStream };
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const addVideoSource = useCallback(async () => {
    if (selectedVideoSourceDevice) {
      const device = selectedVideoSourceDevice;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: device.deviceId } } });
      setVideoSources((sources) => [...sources, { device, stream }]);
    }
    setSelectedVideoSourceDevice(undefined);
  }, [selectedVideoSourceDevice]);
  const removeVideoSource = useCallback((source: VideoSource) => {
    source.stream.getTracks().forEach((track) => track.stop());
    setVideoSources((sources) => sources.filter((s) => s.device.deviceId !== source.device.deviceId));
  }, []);

  const [recording, setRecording] = useState<Deferred<void>>();
  const record = useCallback(async () => {
    if (recording) {
      return;
    }
    const title = new Date().toISOString();
    const recordingDeferred = new Deferred<void>();
    setRecording(recordingDeferred);

    const videoRecorders = videoSources.map(({ device, stream }) => {
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      return { device, recorder };
    });

    const videoRecordPromises = videoRecorders.map(async ({ device, recorder }) => {
      const chunks = [];
      for await (const chunk of iterRecording(recorder)) {
        chunks.push(chunk);
      }
      const blob = new Blob(chunks, { type: "video/webm" });
      return { device, blob };
    });

    await recordingDeferred.promise;
    videoRecorders.forEach((r) => r.recorder.stop());

    const videos = await Promise.all(videoRecordPromises);
    props.onRecordEnd({ title, videos });
  }, [recording, videoSources]);
  const stop = useCallback(() => {
    if (!recording) {
      return;
    }
    recording.resolve();
    setRecording(undefined);
  }, [recording]);

  return (
    <div className={cn("RealtimeModeView", { "is-recording": recording })}>
      <button onClick={record}>録画</button>
      <button onClick={stop}>停止</button>
      <h2>データソースを追加</h2>
      <h3>動画ソース</h3>
      <select className="RealtimeModeView-videoSourceDeviceSelect" value={selectedVideoSourceDevice?.deviceId} onChange={handleVideoSourceDeviceSelectChange}>
        <option value={undefined}></option>
        {videoSourceDevices.map((device) => {
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
      <button className="RealtimeModeView-videoSourceDeviceSelectAdd" onClick={addVideoSource}>
        動画ソースを追加
      </button>
      <h2>ビュー</h2>
      <div>
        {videoSources.map((source) => (
          <div key={source.device.deviceId}>
            <button onClick={() => removeVideoSource(source)}>削除</button>
            <video autoPlay ref={(element) => element && (element.srcObject = source.stream)} style={{ width: 100 }}></video>
            <span>{source.device.label}</span>
          </div>
        ))}
      </div>
      <div className="RealtimeModeView-dataList"></div>
    </div>
  );
}

export function ReplayModeView(props: { record: Record }) {
  return (
    <div className={cn("ReplayModeView")}>
      <h2>ビュー</h2>
      <div>
        {props.record.videos.map(({ device, blob }) => (
          <div key={device.deviceId}>
            <video autoPlay ref={(element) => element && (element.src = URL.createObjectURL(blob))} style={{ width: 100 }}></video>
            <span>{device.label}</span>
          </div>
        ))}
      </div>
      <div className="RealtimeModeView-dataList"></div>
    </div>
  );
}

export function App() {
  const [floors, setFloors] = useState<Floor[]>([]);
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/");
    socket.addEventListener("message", (event) => {
      const raw = event.data as string;
      const [timeString, values] = raw.split(":");
      const time = parseInt(timeString);
      const rows = values.split(";").map((row) => row.split(",").map((cell) => parseInt(cell)));
      setFloors((floors) => [...floors, { raw, time, rows }]);
    });
    return () => socket.close();
  }, []);

  const lastFloor = floors.at(-1);

  const [records, setRecords] = useState<Record[]>([]);
  const handleRecordEnd = useCallback((record: Record) => {
    setRecords((records) => [...records, record]);
  }, []);

  const [replayModeRecord, setReplayModeRecord] = useState<Record>();

  const [file, setFile] = useState<File>();
  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files || files.length !== 1) {
      setFile(undefined);
    } else {
      setFile(files[0]);
    }
  }, []);
  const handleLoad = useCallback(async () => {
    if (!file) {
      return;
    }
    const record = await loadRecord(file);
    setRecords((records) => {
      if (records.some((r) => r.title === record.title)) {
        return records;
      } else {
        return [...records, record];
      }
    });
  }, [file]);

  return (
    <div className="App">
      <h1>Floor Realtime Analyzer [{replayModeRecord ? "Replay Mode" : "Realtime Mode"}]</h1>
      {replayModeRecord && <button onClick={() => setReplayModeRecord(undefined)}>Switch Realtime Mode</button>}
      <h2>録画一覧</h2>
      <input type="file" onChange={onFileChange} accept=".zip" />
      <button onClick={handleLoad}>load</button>
      <ol>
        {records.map((record) => (
          <li key={record.title}>
            <button onClick={() => setReplayModeRecord(record)}>{record.title}</button>
            <button onClick={() => saveRecord(record)}>save</button>
          </li>
        ))}
      </ol>
      {replayModeRecord ? <ReplayModeView record={replayModeRecord} /> : <RealtimeModeView onRecordEnd={handleRecordEnd} />}

      <h2>Floor</h2>
      {lastFloor ? <Floor data={lastFloor} /> : <p>No Data</p>}
      <h2>Last Message</h2>
      <p className="App_lastFloorRaw">{lastFloor?.raw}</p>
    </div>
  );
}

export function Floor(props: { data: Floor }) {
  return (
    <div className="Floor">
      {props.data.rows.map((row, index) => (
        <div key={index} className="Floor_row">
          {row.map((cell, index) => (
            <div key={index} className="Floor_cell" style={{ backgroundColor: `rgba(0,0,0,${cell / 1000})` }}></div>
          ))}
        </div>
      ))}
    </div>
  );
}
