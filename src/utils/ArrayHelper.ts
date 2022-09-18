export function longZip<T, U>(a1: T[], a2: U[]) {
  const zipped: [T, U][] = [];
  for (let i = 0; i < Math.max(a1.length, a2.length); i++) {
    zipped.push([a1[i], a2[i]]);
  }
  return zipped;
}

export function shortZip<T, U>(a1: T[], a2: U[]) {
  const zipped: [T, U][] = [];
  for (let i = 0; i < Math.min(a1.length, a2.length); i++) {
    zipped.push([a1[i], a2[i]]);
  }
  return zipped;
}
