import type { AirportRef } from '../types/trave';

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatDateTime = (dt: string) => {
  // expects "YYYY-MM-DD HH:MM"
  try {
    const [date, time] = dt.split(" ");
    const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
    const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
    const jsDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const timeStr = jsDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const weekday = jsDate.toLocaleDateString([], { weekday: "short" });
    const monthDay = jsDate.toLocaleDateString([], { month: "short", day: "numeric" });
    return { time: timeStr, dateLabel: `${weekday}, ${monthDay}` };
  } catch {
    return { time: dt.split(" ")[1] || dt, dateLabel: dt.split(" ")[0] || "" };
  }
};

export const parseDateFromRef = (ref: AirportRef): Date | null => {
  try {
    const [date, time] = ref.time.split(" ");
    const [y, m, d] = date.split("-").map(Number);
    const [hh = 0, mm = 0] = (time || "").split(":").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh, mm);
  } catch {
    return null;
  }
};

export const getDayOffsetSuffix = (start: AirportRef, end: AirportRef) => {
  const startDate = parseDateFromRef(start);
  const endDate = parseDateFromRef(end);
  if (!startDate || !endDate) return "";
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays > 0 ? `+${diffDays}` : "";
};

