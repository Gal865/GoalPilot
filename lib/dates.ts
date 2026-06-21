export function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

export function minutesRemainingToday() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 0, 0, 0);
  return Math.max(30, Math.round((end.getTime() - now.getTime()) / 60000));
}
