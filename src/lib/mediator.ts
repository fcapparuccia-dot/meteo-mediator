export function mediate(values: { value: number; weight: number }[]) {
  const num = values.reduce((s, v) => s + v.value * v.weight, 0);
  const den = values.reduce((s, v) => s + v.weight, 0);
  return den === 0 ? 0 : num / den;
}
