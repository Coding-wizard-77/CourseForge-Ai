export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
