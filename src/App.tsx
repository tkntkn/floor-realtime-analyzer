import { ChangeEvent, useCallback, useState } from "react";
import "./App.css";
import { downloadBlob } from "./utils/binary";
import { Recording, createRecordingFile, loadRecordingFile } from "./domains/recording";
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
    </div>
  );
}
