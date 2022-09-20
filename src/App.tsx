import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import "./App.css";
import { downloadBlob } from "./utils/binary";
import { Recording, createRecordingFile, loadRecordingFile } from "./domains/recording";
import { RealtimeModeView } from "./components/RealtimeModeView";
import { ReplayModeView } from "./components/ReplayModeView";
import { AiOutlinePlusCircle, AiOutlineDownload } from "react-icons/ai";
import classNames from "classnames";

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

  const handleFileLabelKeyDown = useCallback((event: KeyboardEvent<HTMLLabelElement>) => {
    if ([13, 32].includes(event.keyCode)) {
      event.currentTarget.click();
    }
  }, []);

  return (
    <div className="App h-full flex flex-col">
      <header className="flex w-full flex-wrap justify-between items-center mx-auto px-6 py-2.5 font-medium bg-gray-800 text-xl text-white">Floor Realtime Analyzer</header>
      <div className="flex grow">
        <div className="bg-gray-200 w-80 shrink-0">
          <div className="m-2.5 border-b-2 border-gray-800 flex items-center justify-between">
            <h2 className="text-lg">Recording List</h2>
            <details className="inline-block align-baseline ml-2">
              <summary className="relative leading-7 z-10">
                <AiOutlinePlusCircle className="text-lg" />
              </summary>
              <div className="absolute font-thin rounded-md border-gray-800 border pt-10 p-5 -translate-x-2 -translate-y-7 bg-gray-200">
                <label className="w-80 inline-flex cursor-pointer" tabIndex={0} onKeyDown={handleFileLabelKeyDown}>
                  <input type="file" className="hidden" onChange={onFileChange} accept=".zip" />
                  <span className="border border-r-0 border-gray-800 px-3 rounded-l-md shrink-0 bg-gray-800 text-white">Select File</span>
                  <span className="border border-l-0 border-gray-800 px-3 rounded-r-md grow bg-white truncate">{file?.name}</span>
                </label>
                <button onClick={handleLoad} className="ml-3 border border-gray-800 px-3 rounded-md shrink-0 bg-gray-800 text-white">
                  Load
                </button>
              </div>
            </details>
          </div>
          <ul className="list-disc">
            {recordings.map((recording) => (
              <li key={recording.title} className={classNames("flex p-2 px-4 justify-between hover:bg-gray-300", { "bg-red-200": recording === replayModeRecording })}>
                <button onClick={() => setReplayModeRecording(recording)} className="break-all text-left">
                  {recording.title}
                </button>
                <button onClick={() => saveRecording(recording)} className="ml-2">
                  <AiOutlineDownload />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grow overflow-hidden">{replayModeRecording ? <ReplayModeView recording={replayModeRecording} switchMode={() => setReplayModeRecording(undefined)} /> : <RealtimeModeView onRecordingEnd={handleRecordingEnd} />}</div>
      </div>
    </div>
  );
}
