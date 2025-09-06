export function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (samples.length || 1)) || 0;
}
export function smooth(prev, next, alpha = 0.25) {
  return prev + alpha * (next - prev);
}
