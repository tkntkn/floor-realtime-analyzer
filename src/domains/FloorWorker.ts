import { FloorImageData } from "./floor";

self.addEventListener("message", (event) => {
  const images = event.data as FloorImageData[];
  const startTime = +new Date();
  const dataStartTime = images[0].time;
  for (const image of images) {
    const dataTime = image.time - dataStartTime;
    while (true) {
      const pastTime = +new Date() - startTime;
      if (pastTime > dataTime) {
        break;
      }
    }
    self.postMessage(image);
  }
  self.close();
});
