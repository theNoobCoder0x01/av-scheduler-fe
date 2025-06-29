// Comprehensive Gujarati calendar month names and their variations
export const GUJARATI_MONTHS = {
  // Chaitra (March-April) - Month 03
  'chaitra': ['chaitra', 'chaitri', 'chait'],
  
  // Vaishakh (April-May) - Month 04  
  'vaishakh': ['vaishakh', 'vaisakh', 'baisakh'],
  
  // Jyeshtha/Jeth (May-June) - Month 05
  'jyeshtha': ['jyeshtha', 'jyesht', 'jeth'],
  
  // Ashadh (June-July) - Month 06
  'ashadh': ['ashadh', 'ashad', 'ashar'],
  
  // Shravan (July-August) - Month 07
  'shravan': ['shravan', 'savan', 'saavan'],
  
  // Bhadrapad/Bhadarvo (August-September) - Month 08
  'bhadrapad': ['bhadrapad', 'bhadra', 'bhado', 'bhadarvo'],
  
  // Ashwin/Aso (September-October) - Month 09
  'ashwin': ['ashwin', 'aso', 'aaso'],
  
  // Kartik/Kartak (October-November) - Month 10
  'kartik': ['kartik', 'kartika', 'karthik', 'kartak'],
  
  // Margashirsha/Magshar (November-December) - Month 11
  'margashirsha': ['margashirsha', 'margshirsh', 'aghan', 'magshar'],
  
  // Paush/Posh (December-January) - Month 12
  'paush': ['paush', 'posh', 'pausha'],
  
  // Magh/Maha (January-February) - Month 01
  'magh': ['magh', 'mag', 'magha', 'maha'],
  
  // Falgun/Fagan (February-March) - Month 02
  'falgun': ['falgun', 'phalgun', 'fagun', 'fagan']
};

// Common Gujarati calendar terms (kept for reference but not removed)
export const GUJARATI_CALENDAR_TERMS = [
  'sud', 'vad', 'shukla', 'krishna', 'paksha',
  'purnima', 'punam', 'amavasya', 'amas', 'ekadashi', 'chaturdashi',
  'pancham', 'saptam', 'navami', 'dashami', 'dasham',
  'bij', 'trij', 'choth', 'pancham', 'chhath',
  'satam', 'aatham', 'atham', 'nom', 'dasham', 'agiyaras',
  'baras', 'teras', 'chaudas', 'poonam', 'padvo'
];

/**
 * Removes ONLY Gujarati month names from event summary, keeping other calendar terms
 */
export function removeGujaratiMonthNames(summary: string): string {
  if (!summary) return summary;

  let cleanedSummary = summary;

  // Remove ONLY Gujarati month names (not other calendar terms)
  Object.values(GUJARATI_MONTHS).flat().forEach(monthName => {
    // Create a more precise regex that matches whole words and handles word boundaries
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

/**
 * Test function to verify month name removal (for development/debugging)
 */
export function testMonthRemoval() {
  const testCases = [
    "Posh Sud Bij",
    "Maha Sud Trij", 
    "Fagan Sud Padvo",
    "Chaitra Sud Choth",
    "Vaishakh Sud Ekadashi (FAST)",
    "Jeth Sud Bij",
    "Ashadh Sud Chhath",
    "Shravan Sud Atham",
    "Bhadarvo Sud Nom",
    "Aso Sud Ekadashi (FAST)",
    "Kartak Sud Dasham",
    "Magshar Sud Ekadashi (FAST)"
  ];

  console.log("Testing Gujarati month name removal:");
  testCases.forEach(testCase => {
    const result = removeGujaratiMonthNames(testCase);
    console.log(`"${testCase}" → "${result}"`);
  });
}