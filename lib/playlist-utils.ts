export function generateM3uContent(mediaFiles: string): string {
  // Start with the M3U header
  let content = "#EXTM3U\n";
  
  // Split the input by newlines and process each line
  const lines = mediaFiles.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Extract filename from path (for display purposes)
    const fileName = trimmedLine.split(/[\\/]/).pop() || trimmedLine;
    
    // Add the EXTINF line (duration and title)
    // For simplicity, we use -1 for duration (unknown) and the filename as title
    content += `#EXTINF:-1,${fileName}\n`;
    
    // Add the file path or URL
    content += `${trimmedLine}\n`;
  }
  
  return content;
}

export function parseM3uContent(content: string): string[] {
  const lines = content.split('\n');
  const files: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments (except EXTINF)
    if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
      continue;
    }
    
    // Skip EXTINF lines, but the next line should be a file
    if (line.startsWith('#EXTINF')) {
      continue;
    }
    
    // Add file path or URL
    files.push(line);
  }
  
  return files;
}

/**
 * Generates possible M3U filenames for events with slash-separated tithi names
 * For "12 Sud Chaudas/Punam", it returns:
 * 1. "12 Sud Chaudas.m3u" (first part)
 * 2. "12 Sud Punam.m3u" (second part)  
 * 3. "12 Sud Chaudas/Punam.m3u" (original with slash)
 */
export function generatePlaylistFilenames(eventName: string): string[] {
  if (!eventName) return [];

  // Clean the event name for file system compatibility
  const cleanName = eventName.replace(/[<>:"|?*]/g, "_");
  
  // Check if the event name contains a slash
  if (cleanName.includes('/')) {
    const parts = cleanName.split('/').map(part => part.trim());
    const filenames: string[] = [];
    
    // Extract the prefix (everything before the last space before the slash)
    const slashIndex = cleanName.indexOf('/');
    const beforeSlash = cleanName.substring(0, slashIndex);
    const afterSlash = cleanName.substring(slashIndex + 1);
    
    // Find the last space before the slash to get the prefix
    const lastSpaceIndex = beforeSlash.lastIndexOf(' ');
    const prefix = lastSpaceIndex !== -1 ? beforeSlash.substring(0, lastSpaceIndex + 1) : '';
    const firstTithi = lastSpaceIndex !== -1 ? beforeSlash.substring(lastSpaceIndex + 1) : beforeSlash;
    
    // 1. First tithi: "12 Sud Chaudas.m3u"
    filenames.push(`${prefix}${firstTithi}.m3u`);
    
    // 2. Second tithi: "12 Sud Punam.m3u"
    filenames.push(`${prefix}${afterSlash.trim()}.m3u`);
    
    // 3. Original with slash: "12 Sud Chaudas/Punam.m3u"
    filenames.push(`${cleanName}.m3u`);
    
    return filenames;
  } else {
    // No slash, return single filename
    return [`${cleanName}.m3u`];
  }
}

/**
 * Test function to verify playlist filename generation
 */
export function testPlaylistFilenames() {
  const testCases = [
    "12 Sud Chaudas/Punam",
    "05 Sud Bij/Trij", 
    "08 Vad Baras/Teras",
    "03 Sud Ekadashi",
    "Independence Day",
    "10 Sud Choth/Pancham"
  ];

  console.log("Testing playlist filename generation:");
  testCases.forEach(testCase => {
    const filenames = generatePlaylistFilenames(testCase);
    console.log(`"${testCase}" →`);
    filenames.forEach((filename, index) => {
      console.log(`  ${index + 1}. ${filename}`);
    });
    console.log();
  });
}