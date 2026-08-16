const SHORT_MONTHS = [
  "янв.",
  "февр.",
  "марта",
  "апр.",
  "мая",
  "июня",
  "июля",
  "авг.",
  "сен.",
  "окт.",
  "нояб.",
  "дек.",
] as const;

const FULL_MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/**
 * Parses a date input (string YYYY-MM-DD or ISO, timestamp number, or Date)
 * safely extracting year, month, and day without timezone shift issues.
 */
function parseDateParts(input: string | number | Date | null | undefined): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!input) return null;

  if (typeof input === "string") {
    // Check for YYYY-MM-DD standard format
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11) {
        return { year, month, day };
      }
    }
  }

  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;

  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

/**
 * Formats a release date for compact model display.
 * - If current year: "14 авг.", "5 мая", "12 сент."
 * - If other year: "14 авг. 2025"
 */
export function formatModelDate(
  input: string | number | Date | null | undefined,
  currentYear = new Date().getFullYear(),
): string {
  const parts = parseDateParts(input);
  if (!parts) return "";

  const monthName = SHORT_MONTHS[parts.month];
  if (parts.year === currentYear) {
    return `${parts.day} ${monthName}`;
  }
  return `${parts.day} ${monthName} ${parts.year}`;
}

/**
 * Formats a date for full tooltip display.
 * e.g. "14 августа 2026"
 */
export function formatFullDate(input: string | number | Date | null | undefined): string {
  const parts = parseDateParts(input);
  if (!parts) return "";

  const monthName = FULL_MONTHS_GENITIVE[parts.month];
  return `${parts.day} ${monthName} ${parts.year}`;
}
