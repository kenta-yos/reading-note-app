export function relativeTime(date: Date | string): string {
  const now = Date.now();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "たった今";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ヶ月前`;
  return `${Math.floor(months / 12)}年前`;
}
