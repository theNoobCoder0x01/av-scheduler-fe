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

// Common Gujarati calendar terms (used for sorting priority)
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
 * Checks if an event summary contains any Gujarati calendar terms
 */
export function hasGujaratiCalendarTerms(summary: string): boolean {
  if (!summary) return false;
  
  const lowerSummary = summary.toLowerCase();
  return GUJARATI_CALENDAR_TERMS.some(term => 
    lowerSummary.includes(term.toLowerCase())
  );
}

/**
 * Sorts events with Gujarati calendar terms first, then by start date
 */
export function sortEventsByGujaratiTerms<T extends { summary: string; start: number | Date }>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aHasTerms = hasGujaratiCalendarTerms(a.summary);
    const bHasTerms = hasGujaratiCalendarTerms(b.summary);
    
    // First sort by presence of Gujarati calendar terms
    if (aHasTerms && !bHasTerms) return -1;
    if (!aHasTerms && bHasTerms) return 1;
    
    // Then sort by start date
    const aStart = typeof a.start === 'number' ? a.start : Math.floor(a.start.getTime() / 1000);
    const bStart = typeof b.start === 'number' ? b.start : Math.floor(b.start.getTime() / 1000);
    
    return aStart - bStart;
  });
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

/**
 * Test function to verify sorting functionality
 */
export function testEventSorting() {
  const testEvents = [
    { summary: "Independence Day", start: 1692057600 }, // Regular event
    { summary: "05 Sud Ekadashi (FAST)", start: 1691971200 }, // Gujarati event (earlier date)
    { summary: "Meeting with Team", start: 1692144000 }, // Regular event
    { summary: "08 Vad Chaturdashi", start: 1692230400 }, // Gujarati event (later date)
    { summary: "Birthday Party", start: 1691884800 }, // Regular event (earliest date)
  ];

  console.log("Testing event sorting:");
  console.log("Original order:", testEvents.map(e => e.summary));
  
  const sorted = sortEventsByGujaratiTerms(testEvents);
  console.log("Sorted order:", sorted.map(e => e.summary));
  console.log("Expected: Gujarati events first (by date), then regular events (by date)");
}