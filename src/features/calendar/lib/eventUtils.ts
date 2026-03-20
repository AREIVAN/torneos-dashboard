import type { CalendarEvent } from "../api/getEvents";

/** Parse a CSV or array field into a string array */
export function evArr(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Get the main category from a tournament */
export function evMainCategory(t: CalendarEvent): string {
  const cats = evArr(t.categories);
  return cats[0] || "";
}

/** Get all chips (categories + tags) for a tournament */
export function evAllChips(t: CalendarEvent): string[] {
  return [evMainCategory(t), ...evArr(t.categories), ...evArr(t.tags)].filter(
    Boolean
  );
}

/** Parse the start date from an event */
export function evPickDate(t: CalendarEvent): Date | null {
  for (const k of ["start_at", "created_at"] as const) {
    const val = (t as unknown as Record<string, unknown>)[k];
    if (val) {
      const d = new Date(val as string);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** Format a date with optional timezone for display */
export function evFmtDate(d: Date, tz?: string | null): string {
  if (!d) return "—";
  try {
    const opt: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    if (tz) opt.timeZone = tz;
    return new Intl.DateTimeFormat("es-MX", opt).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Format a countdown from ms to human readable */
export function evFmtCountdown(ms: number): string {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

/** Check if a tournament matches a text query */
export function evMatchesQuery(t: CalendarEvent, q: string): boolean {
  if (!q) return true;
  const hay = [
    t.name,
    t.city,
    t.venue,
    t.address,
    t.description,
    t.official_url,
    t.registration_url,
    t.rules_url,
    ...evArr(t.categories),
    ...evArr(t.tags),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

/** Check if a tournament matches a chip filter */
export function evMatchesChip(t: CalendarEvent, chip: string): boolean {
  if (!chip || chip === "ALL") return true;
  const all = new Set(
    evAllChips(t).map((x) => x.toLowerCase())
  );
  return all.has(chip.toLowerCase());
}

/** Build unique filter chips from all events */
export function evBuildFilterChips(
  events: { t: CalendarEvent }[]
): string[] {
  const set = new Map<string, string>();
  for (const { t } of events) {
    for (const v of evAllChips(t)) {
      const s = v.trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (!set.has(key)) set.set(key, s);
    }
  }
  return Array.from(set.values())
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 14);
}

/** Generate a Google Maps search link */
export function evMapsLink(t: CalendarEvent): string {
  const q = [t.venue, t.address, t.city].filter(Boolean).join(" ");
  if (!q) return "";
  return (
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q)
  );
}

/** Generate an ICS file blob from upcoming events */
export function evGenerateICS(
  rows: { t: CalendarEvent; d: Date }[]
): Blob {
  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function dtICS(d: Date) {
    const x = new Date(d);
    return (
      x.getUTCFullYear() +
      pad(x.getUTCMonth() + 1) +
      pad(x.getUTCDate()) +
      "T" +
      pad(x.getUTCHours()) +
      pad(x.getUTCMinutes()) +
      pad(x.getUTCSeconds()) +
      "Z"
    );
  }

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//APEX//Minisumo Events//ES");
  rows.forEach((r) => {
    const t = r.t;
    const uid = (t.id || t.name + "-" + r.d.getTime()).toString() + "@apex";
    const start = dtICS(r.d);
    const end = t.end_at
      ? dtICS(new Date(t.end_at))
      : dtICS(new Date(r.d.getTime() + 2 * 60 * 60 * 1000));
    const summary = (t.name || "Evento").replace(/\n/g, " ");
    const loc = [t.venue, t.address, t.city]
      .filter(Boolean)
      .join(", ")
      .replace(/\n/g, " ");
    const url = (t.official_url || "").replace(/\n/g, " ");
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + uid);
    lines.push("DTSTAMP:" + dtICS(new Date()));
    lines.push("DTSTART:" + start);
    lines.push("DTEND:" + end);
    lines.push("SUMMARY:" + summary);
    if (loc) lines.push("LOCATION:" + loc);
    if (url) lines.push("URL:" + url);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");

  return new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
}
