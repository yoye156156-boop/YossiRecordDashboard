export function computeRms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function smoother(alpha = 0.2) {
  let v = 0;
  return (next) => (v = v + alpha * (next - v));
}

export { computeRms as rms, smoother as smooth };
