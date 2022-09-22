import { FloorImage } from "./FloorImage";

describe("<FloorImage />", () => {
  it("データの数だけのタイルが表示されている 2x1", () => {
    const data = [{ string: "", time: 0, rows: [[0], [1]] }];
    cy.mount(<FloorImage data={data} />);
    cy.get(".Floor_row")
      .should("have.length", 2)
      .each(($el) => cy.wrap($el).children().should("have.length", 1));
  });

  it("データの数だけのタイルが表示されている 3x4", () => {
    const data = [
      {
        string: "",
        time: 0,
        rows: [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [2, 2, 2, 2],
        ],
      },
    ];
    cy.mount(<FloorImage data={data} />);
    cy.get(".Floor_row")
      .should("have.length", 3)
      .each(($el) => cy.wrap($el).children().should("have.length", 4));
  });
});
