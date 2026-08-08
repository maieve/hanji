export function summarizeNativeAvailability(items: { available: boolean }[]) {
  const available = items.filter((item) => item.available).length;
  return { available, total: items.length, ready: items.length > 0 && available === items.length };
}
