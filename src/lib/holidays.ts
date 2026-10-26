import { format, differenceInCalendarDays, startOfDay } from "date-fns";

export interface HolidayInfo {
  name: string;
  isHoliday: boolean; // true if public day off (red day)
}

// Fixed solar holidays (Month-Day format)
const fixedHolidays: Record<string, string> = {
  "01-01": "신정",
  "03-01": "삼일절",
  "05-05": "어린이날",
  "06-06": "현충일",
  "08-15": "광복절",
  "10-03": "개천절",
  "10-09": "한글날",
  "12-25": "크리스마스",
};

// Variable holidays (Lunar New Year, Chuseok, Buddha's Birthday, Substitutions) for 2025~2027
const variableHolidays: Record<string, string> = {
  // 2025
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-05-05": "어린이날/부처님오신날",
  "2025-05-06": "대체공휴일",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "대체공휴일",

  // 2026
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-02": "대체공휴일",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-09-28": "대체공휴일",

  // 2027
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일",
  "2027-05-13": "부처님오신날",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
};

/**
 * Returns Korean public holiday information for a given date
 */
export function getHoliday(date: Date): HolidayInfo | null {
  const fullKey = format(date, "yyyy-MM-dd");
  const monthDay = format(date, "MM-dd");

  if (variableHolidays[fullKey]) {
    return { name: variableHolidays[fullKey], isHoliday: true };
  }

  if (fixedHolidays[monthDay]) {
    return { name: fixedHolidays[monthDay], isHoliday: true };
  }

  return null;
}

/**
 * Calculates D-Day label between today and target date
 */
export function calculateDDay(targetDate: Date): { label: string; days: number } {
  const today = startOfDay(new Date());
  const target = startOfDay(targetDate);
  const diff = differenceInCalendarDays(target, today);

  if (diff === 0) return { label: "D-Day (오늘)", days: 0 };
  if (diff > 0) return { label: `D-${diff}`, days: diff };
  return { label: `D+${Math.abs(diff)}`, days: diff };
}
