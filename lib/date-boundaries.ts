/**
 * Calendar-day boundaries in an IANA timezone. Persistence stays UTC; only the
 * view's range is calculated in the member's local calendar.
 */
function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function offsetAt(date: Date, timeZone: string) {
  const part = dateParts(date, timeZone);
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) - date.getTime();
}

function utcForLocalMidnight(year: number, month: number, day: number, timeZone: string) {
  const guess = new Date(Date.UTC(year, month - 1, day));
  // Re-evaluate after applying the offset for a correct result around DST.
  const first = new Date(guess.getTime() - offsetAt(guess, timeZone));
  return new Date(guess.getTime() - offsetAt(first, timeZone));
}

export function localDayBounds(timeZone: string, now = new Date()) {
  const current = dateParts(now, timeZone);
  const following = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  return {
    start: utcForLocalMidnight(current.year, current.month, current.day, timeZone),
    end: utcForLocalMidnight(following.getUTCFullYear(), following.getUTCMonth() + 1, following.getUTCDate(), timeZone),
  };
}
