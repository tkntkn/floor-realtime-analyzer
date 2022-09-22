import { WebSocket, Server } from "mock-socket";
import { App } from "./App";
import { FloorImage } from "./components/FloorImage";
import { RealtimeModeView } from "./components/RealtimeModeView";

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
