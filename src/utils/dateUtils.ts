/** Return a date-only value in the browser's local calendar, safe for date inputs. */
export const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Return a local date-only value offset by a number of calendar days. */
export const getLocalDateStringOffset = (days: number, date = new Date()): string => {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return getLocalDateString(shifted);
};

/** Return the first day of the local calendar month containing the supplied date. */
export const getLocalMonthStartString = (date = new Date()): string => {
  return getLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1));
};

export const getLocalYearStartString = (date = new Date()): string => {
  return `${date.getFullYear()}-01-01`;
};

/** Parse a YYYY-MM-DD value as a local calendar date for display/sorting only. */
export const parseLocalDateOnly = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
