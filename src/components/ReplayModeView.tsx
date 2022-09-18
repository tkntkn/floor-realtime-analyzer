import cn from "classnames";
import { Recording } from "../domains/recording";

export function ReplayModeView(props: { recording: Recording }) {
  return (
    <div className={cn("ReplayModeView")}>
      <h2>Replay Mode</h2>
      <h3>Controller</h3>
      <h3>Viewer</h3>
      <div>
        {props.recording.videos.map(({ device, blob }) => (
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
