import App from "./App";

describe("<App />", () => {
  it("playground", () => {
    cy.mount(<App />);
    cy.get(".App").should("have.text", "Hello World!");
  });
});
