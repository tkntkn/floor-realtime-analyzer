import { promisifyEvent } from "./EventHelper";

async function* recordAsIterator(recorder: MediaRecorder, timeslice?: number) {
  recorder.start(timeslice);
  const stop = promisifyEvent(recorder, "stop");
  while (true) {
    const ac = new AbortController();
    const dataavailable = promisifyEvent(recorder, "dataavailable", ac);
    const raced = await Promise.race([stop, dataavailable]);
    if (raced instanceof BlobEvent) {
      yield raced;
    } else {
      ac.abort();
      return;
    }
  }
}

async function recordAsBlob(recorder: MediaRecorder, type: string, timeslice?: number) {
  const chunks = [];
  for await (const event of recordAsIterator(recorder, timeslice)) {
    chunks.push(event.data);
  }
  return new Blob(chunks, { type });
}

export function recordStream(stream: MediaStream, mimeType: string, timeslice?: number) {
  const recorder = new MediaRecorder(stream, { mimeType });
  const recording = recordAsBlob(recorder, mimeType, timeslice);
  return async function stopAndGetBlob() {
    recorder.stop();
    return await recording;
  };
}

export function recordStreams(streams: MediaStream[], mimeType: string, timeslice?: number) {
  const recordings = streams.map((stream) => recordStream(stream, mimeType, timeslice));
  return async function stopAndGetBlobs() {
    return await Promise.all(recordings.map(async (stopAndGetBlob) => await stopAndGetBlob()));
  };
}
