// Determine the current academic year string based on date.
// In Algeria/most school systems: September → next August.
export const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = January
  // From September (month 8) onwards: year/year+1, otherwise year-1/year
  if (month >= 8) {
    return `${year} / ${year + 1}`;
  }
  return `${year - 1} / ${year}`;
};

export const getNextAcademicYear = (current: string): string => {
  const match = current.match(/(\d{4})\s*\/\s*(\d{4})/);
  if (!match) return getCurrentAcademicYear();
  const start = parseInt(match[1], 10) + 1;
  const end = parseInt(match[2], 10) + 1;
  return `${start} / ${end}`;
};
