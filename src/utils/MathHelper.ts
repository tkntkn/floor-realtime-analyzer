export function map(value: number, dm: number, dM: number, vm: number, vM: number) {
  return ((value - dm) / (dM - dm)) * (vM - vm) + vm;
}
