export const DUE_SOON_DAYS = 7;

export function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dueSoonHorizon(todayKey) {
  return addDays(todayKey, DUE_SOON_DAYS);
}

export function isDueSoon(dueDateKey, todayKey) {
  if (!dueDateKey || !todayKey) return false;
  return dueDateKey >= todayKey && dueDateKey <= dueSoonHorizon(todayKey);
}
