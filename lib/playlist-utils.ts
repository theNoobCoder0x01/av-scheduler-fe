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