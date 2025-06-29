// Gujarati calendar month names and their variations
export const GUJARATI_MONTHS = {
  // Chaitra (March-April)
  'chaitra': ['chaitra', 'chaitri', 'chait'],
  'vaishakh': ['vaishakh', 'vaisakh', 'baisakh'],
  'jyeshtha': ['jyeshtha', 'jyesht', 'jeth'],
  'ashadh': ['ashadh', 'ashad', 'ashar'],
  'shravan': ['shravan', 'savan', 'saavan'],
  'bhadrapad': ['bhadrapad', 'bhadra', 'bhado'],
  'ashwin': ['ashwin', 'aso', 'aaso'],
  'kartik': ['kartik', 'kartika', 'karthik'],
  'margashirsha': ['margashirsha', 'margshirsh', 'aghan'],
  'paush': ['paush', 'posh', 'pausha'],
  'magh': ['magh', 'mag', 'magha'],
  'falgun': ['falgun', 'phalgun', 'fagun']
};

// Common Gujarati calendar terms (kept for reference but not removed)
export const GUJARATI_CALENDAR_TERMS = [
  'sud', 'vad', 'shukla', 'krishna', 'paksha',
  'purnima', 'amavasya', 'ekadashi', 'chaturdashi',
  'pancham', 'saptam', 'navami', 'dashami',
  'bij', 'trij', 'choth', 'pancham', 'chhath',
  'satam', 'aatham', 'nom', 'dasham', 'agiyaras',
  'baras', 'teras', 'chaudas', 'poonam'
];

/**
 * Removes ONLY Gujarati month names from event summary, keeping other calendar terms
 */
export function removeGujaratiMonthNames(summary: string): string {
  if (!summary) return summary;

  let cleanedSummary = summary;

  // Remove ONLY Gujarati month names (not other calendar terms)
  Object.values(GUJARATI_MONTHS).flat().forEach(monthName => {
    const regex = new RegExp(`\\b${monthName}\\b`, 'gi');
    cleanedSummary = cleanedSummary.replace(regex, '');
  });

  // Clean up extra spaces and trim
  cleanedSummary = cleanedSummary
    .replace(/\s+/g, ' ')
    .trim();

  // Preserve original capitalization but ensure first letter is capitalized
  if (cleanedSummary.length > 0) {
    cleanedSummary = cleanedSummary.charAt(0).toUpperCase() + cleanedSummary.slice(1);
  }

  return cleanedSummary;
}

/**
 * Gets the month number (MM format) from a date
 */
export function getMonthFromDate(date: number | Date): string {
  if (typeof date === "number") {
    date = new Date(date * 1000); // Convert seconds to milliseconds
  }
  return String(date.getMonth() + 1).padStart(2, '0');
}

/**
 * Processes event summary by removing Gujarati month names and adding month prefix
 */
export function processEventSummary(summary: string, startDate: number | Date): string {
  const cleanedSummary = removeGujaratiMonthNames(summary);
  const monthNumber = getMonthFromDate(startDate);
  
  // Only add month prefix if the summary doesn't already start with a month number
  if (!/^\d{2}\s/.test(cleanedSummary)) {
    return `${monthNumber} ${cleanedSummary}`;
  }
  
  return cleanedSummary;
}