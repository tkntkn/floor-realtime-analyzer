import { ChangeEvent, useCallback, useEffect, useState } from "react";
import cn from "classnames";
import "./App.css";
import { downloadBlob } from "./utils/binary";
import { Recording, createRecordingFile, loadRecordingFile } from "./domains/recording";
import { Floor, parseFloor } from "./domains/floor";
import { RealtimeModeView } from "./components/RealtimeModeView";
import { ReplayModeView } from "./components/ReplayModeView";

export function App() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const handleRecordingEnd = useCallback((recording: Recording) => {
    setRecordings((recordings) => [...recordings, recording]);
  }, []);

  const [replayModeRecording, setReplayModeRecording] = useState<Recording>();

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
    const recording = await loadRecordingFile(file);
    setRecordings((recordings) => {
      if (recordings.some((r) => r.title === recording.title)) {
        return recordings;
      } else {
        return [...recordings, recording];
      }
    });
  }, [file]);
  const saveRecording = useCallback(async (recording: Recording) => {
    const file = await createRecordingFile(recording);
    downloadBlob(file, `${recording.title.replace(/[\.:]/g, "_")}.zip`);
  }, []);

  return (
    <div className="App">
      <h1>Floor Realtime Analyzer [{replayModeRecording ? "Replay Mode" : "Realtime Mode"}]</h1>
      {replayModeRecording && <button onClick={() => setReplayModeRecording(undefined)}>Switch Realtime Mode</button>}
      <h2>Recording List</h2>
      <input type="file" onChange={onFileChange} accept=".zip" />
      <button onClick={handleLoad}>load</button>
      <ol>
        {recordings.map((recording) => (
          <li key={recording.title}>
            <button onClick={() => setReplayModeRecording(recording)}>{recording.title}</button>
            <button onClick={() => saveRecording(recording)}>save</button>
          </li>
        ))}
      </ol>
      {replayModeRecording ? <ReplayModeView recording={replayModeRecording} /> : <RealtimeModeView onRecordingEnd={handleRecordingEnd} />}

      <FloorView />
    </div>
  );
}

export function FloorView() {
  const [floors, setFloors] = useState<Floor[]>([]);
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/");
    socket.addEventListener("message", (event) => {
      const floor = parseFloor(event.data as string);
      setFloors((floors) => [...floors, floor]);
    });
    return () => socket.close();
  }, []);

  const lastFloor = floors.at(-1);

  if (!lastFloor) {
    return (
      <div className="Floor">
        <h2>Floor</h2>
        <p>No Data</p>
      </div>
    );
  }

  return (
    <div className="Floor">
      <h2>Floor</h2>
      {lastFloor.rows.map((row, index) => (
        <div key={index} className="Floor_row">
          {row.map((cell, index) => (
            <div key={index} className="Floor_cell" style={{ backgroundColor: `rgba(0,0,0,${cell / 1000})` }}></div>
          ))}
        </div>
      ))}
      <h3>Last Message</h3>
      <p className="App_lastFloorRaw">{lastFloor?.string}</p>
    </div>
  );
}
