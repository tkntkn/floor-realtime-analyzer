import { WebSocket, Server } from "mock-socket";
import { App, Floor, RealtimeModeView } from "./App";

describe("<App />", () => {
  let mockServer: Server;
  before(() => {
    mockServer = new Server("ws://localhost:8080/");
    cy.stub(window, "WebSocket").callsFake((url) => {
      let value = 0;
      setInterval(() => {
        mockServer.emit("message", `${+new Date()}:${value},${value},${value};${value},${value},${value};${value},${value},${value}`);
        value++;
      }, 100);
      return new WebSocket(url);
    });
  });

  beforeEach(() => {
    cy.mount(<App />);
  });

  it("タイトルが表示されている", () => {
    cy.get("h1").should("have.text", "Floor Realtime Analyzer");
  });

  it("WebSocketの最新メッセージが表示されている", () => {
    cy.get(".App_lastFloorRaw").contains(":0,0,0;0,0,0;0,0,0");
    cy.get(".App_lastFloorRaw").contains(":1,1,1;1,1,1;1,1,1");
    cy.get(".App_lastFloorRaw").contains(":2,2,2;2,2,2;2,2,2");
    cy.get(".App_lastFloorRaw").contains(":3,3,3;3,3,3;3,3,3");
    cy.get(".App_lastFloorRaw").contains(":4,4,4;4,4,4;4,4,4");
    cy.get(".App_lastFloorRaw").contains(":5,5,5;5,5,5;5,5,5");
  });

  after(() => {
    mockServer.stop();
  });
});

describe("<Floor />", () => {
  it("データの数だけのタイルが表示されている 2x1", () => {
    const data = { raw: "", time: 0, rows: [[0], [1]] };
    cy.mount(<Floor data={data} />);
    cy.get(".Floor_row")
      .should("have.length", 2)
      .each(($el) => cy.wrap($el).children().should("have.length", 1));
  });

  it("データの数だけのタイルが表示されている 3x4", () => {
    const data = {
      raw: "",
      time: 0,
      rows: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [2, 2, 2, 2],
      ],
    };
    cy.mount(<Floor data={data} />);
    cy.get(".Floor_row")
      .should("have.length", 3)
      .each(($el) => cy.wrap($el).children().should("have.length", 4));
  });
});

describe("<RealtimeModeView />", () => {
  // before(() => {
  //   const devices = JSON.parse('[{"deviceId":"","kind":"audioinput","label":"","groupId":"c2fa6b1847720027d70fbf3906960b87124c8df611a2c222fb5f77d34abe3761"},{"deviceId":"72cbc9a1982c88e2f34d12db2650c58ca40625e1e343144adbcbcde81345fd64","kind":"videoinput","label":"HD WebCam (1bcf:2c6b)","groupId":"d14a3b8cd1df4b21528154d256820d01634a8390bc80188a19d018c3a6dc5adf"},{"deviceId":"8849005535c3e393c10ae8029b582d996e69fdc74c9bb5f002be89dba2e8f8a5","kind":"videoinput","label":"Iriun Webcam","groupId":"dab6c73856e5cd6dd44fec1beb3c7122395b78f8d0daa7c85595f06fe8df081f"},{"deviceId":"b62e3ac1bd45fc971eb2d3d9d2a83e5ba4859b7c8ee35f0875e2772822e19500","kind":"videoinput","label":"Camera (NVIDIA Broadcast)","groupId":"84820e6364c4dc891b86da7a94a38e4b63adbe4203f45cf655dc6950f004f883"},{"deviceId":"f290b5e553548e7bfe754ffcc47884b5f5677b03a6197f60041e1f471229e359","kind":"videoinput","label":"OBS Virtual Camera","groupId":"657238ce761157b062ddb063f9b7299cb5677b9440147eb9ed6af2732b904bc5"},{"deviceId":"e9b4c54c1d5447849262419349d18a36f895437cbe5392830b3c1b0f076c4b08","kind":"videoinput","label":"Immersed Webcam","groupId":"48bf870d228ff5903db4aa0fbe489ac0d3ac0d6b91d0823216929b2875b8cadf"},{"deviceId":"","kind":"audiooutput","label":"","groupId":"c2fa6b1847720027d70fbf3906960b87124c8df611a2c222fb5f77d34abe3761"}]');
  //   cy.stub(navigator.mediaDevices, "enumerateDevices").callsFake(() => Promise.resolve(devices));
  // });

  beforeEach(() => {
    cy.mount(<RealtimeModeView onRecordEnd={() => void 0} />);
  });

  it("録画ボタンを押すと録画中になる", () => {
    cy.get(".RealtimeModeView.is-recording").should("not.exist");
    cy.get("button").contains("録画").click();
    cy.get(".RealtimeModeView.is-recording").should("exist");
    cy.get("button").contains("停止").click();
    cy.get(".RealtimeModeView.is-recording").should("not.exist");
  });

  it("撮影デバイスの一覧からデバイスを選択して取得できる", () => {
    cy.get(".RealtimeModeView-videoSourceDeviceSelect").children().should("have.length", 2);
    cy.get(".RealtimeModeView-videoSourceDeviceSelect").select("fake_device_0");
    cy.get(".RealtimeModeView-videoSourceDeviceSelectAdd").click();
    cy.get(".RealtimeModeView-videoSourceDeviceSelect").children().should("have.length", 1);
  });
});
