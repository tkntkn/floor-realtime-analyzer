import JSZip from "jszip";

export type Recording = {
  title: string;
  videos: Array<{
    device: MediaDeviceInfo;
    blob: Blob;
  }>;
};

export async function loadRecordingFile(file: File): Promise<Recording> {
  const zip = await JSZip.loadAsync(file.arrayBuffer());
  const recording: Recording = JSON.parse(await zip.file("recording.json")!.async("string"));
  const loadBlob = recording.videos.map(async (video, index) => {
    video.blob = await zip.file(new RegExp(`^${index}-.*\.webm$`))[0].async("blob");
  });
  await Promise.all(loadBlob);
  return recording;
}

export async function createRecordingFile(recording: Recording) {
  const zip = new JSZip();
  zip.file(
    "recording.json",
    JSON.stringify({
      title: recording.title,
      videos: recording.videos.map(({ device }) => ({ device })),
    })
  );
  recording.videos.forEach((video, index) => {
    zip.file(`${index}-${video.device.label.replace(/[\.:]/g, "_")}.webm`, video.blob, { binary: true });
  });
  return zip.generateAsync({ type: "blob" });
}
