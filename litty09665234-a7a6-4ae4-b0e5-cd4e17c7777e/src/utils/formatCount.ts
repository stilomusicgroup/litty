export function formatStreamCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1_000_000) {
    const k = (count / 1000).toFixed(1);
    return `${k.replace(/\.0$/, '')}K`;
  }
  const m = (count / 1_000_000).toFixed(1);
  return `${m.replace(/\.0$/, '')}M`;
}
