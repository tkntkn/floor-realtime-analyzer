export interface Floor {
  string: string;
  time: number;
  rows: number[][];
}

export function parseFloor(string: string) {
  const [timeString, values] = string.split(":");
  const time = parseInt(timeString);
  const rows = values.split(";").map((row) => row.split(",").map((cell) => parseInt(cell)));
  return { string, time, rows };
}
