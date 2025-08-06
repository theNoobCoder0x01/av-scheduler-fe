# Enhanced Playlist Creator Integration Guide

## Overview

This guide demonstrates how to integrate the newly rebuilt playlist creator with the enhanced file browser. The new implementation provides a robust, feature-rich experience with advanced functionality while maintaining the familiar interface.

## 🚀 Key Features Implemented

### **Enhanced File Browser**
✅ **Reusable Hook**: `useFileBrowser` for centralized state management  
✅ **Multiple Views**: List, grid, and table views  
✅ **Advanced Navigation**: Back/forward history, breadcrumbs, keyboard shortcuts  
✅ **Smart Search**: Real-time file search with filtering  
✅ **Bulk Operations**: Multi-select with bulk actions  
✅ **Drag & Drop**: Full drag-drop support for files  
✅ **Error Handling**: Comprehensive error recovery and retry logic  
✅ **Performance**: Optimized rendering and memory management  

### **Enhanced Playlist Creator**
✅ **Advanced Track Management**: Rich metadata, favorites, tagging  
✅ **Drag & Drop Reordering**: Visual drag-drop with live preview  
✅ **Smart Filtering**: Search, sort, and filter by multiple criteria  
✅ **Track Details**: Comprehensive track information and editing  
✅ **Import/Export**: Multiple format support (M3U, M3U8, PLS)  
✅ **Bulk Operations**: Select and manage multiple tracks  
✅ **Auto-save**: Optional auto-save functionality  
✅ **Event Integration**: Link playlists to calendar events  

## 📁 File Structure

```
/workspace/
├── hooks/
│   └── use-file-browser.ts          # Reusable file browser hook
├── components/
│   ├── enhanced-file-browser.tsx    # Enhanced file browser component
│   └── enhanced-playlist-creator.tsx # Rebuilt playlist creator
└── components/media-player/
    ├── file-browser.tsx             # Original file browser (still functional)
    └── playlist-creator.tsx         # Original playlist creator (legacy)
```

## 🔧 Basic Integration

### 1. **Simple File Browser Usage**

```tsx
import EnhancedFileBrowser from '@/components/enhanced-file-browser';

function MyComponent() {
  const handleFileSelect = (filePath: string) => {
    console.log('File selected:', filePath);
  };

  const handleMultiSelect = (filePaths: string[]) => {
    console.log('Multiple files selected:', filePaths);
  };

  return (
    <EnhancedFileBrowser
      onFileSelect={handleFileSelect}
      onMultiSelect={handleMultiSelect}
      mediaOnly={true}
      height="h-[500px]"
      viewMode="list"
      showToolbar={true}
      showBulkActions={true}
    />
  );
}
```

### 2. **Basic Playlist Creator Usage**

```tsx
import EnhancedPlaylistCreator from '@/components/enhanced-playlist-creator';

function PlaylistPage() {
  const [events, setEvents] = useState<ICalendarEvent[]>([]);

  const handlePlaylistCreated = (playlistPath: string, metadata: PlaylistMetadata) => {
    console.log('Playlist created:', playlistPath, metadata);
  };

  return (
    <EnhancedPlaylistCreator
      events={events}
      onPlaylistCreated={handlePlaylistCreated}
      enableAdvancedFeatures={true}
      enableTemplates={true}
    />
  );
}
```

## 🎛️ Advanced Configuration

### **File Browser Hook Configuration**

```tsx
import { useFileBrowser } from '@/hooks/use-file-browser';

function CustomFileBrowser() {
  const {
    // State
    currentContents,
    selectedFiles,
    isLoading,
    error,
    
    // Actions
    browseDirectory,
    toggleFileSelection,
    selectAllMedia,
    searchFiles,
    refresh,
    
    // Computed
    hasSelection,
    selectedCount,
    getFilteredItems,
  } = useFileBrowser({
    mediaOnly: true,
    multiSelect: true,
    autoSelectPlaylists: false,
    initialPath: '/music/library',
  });

  // Custom implementation using the hook
  return (
    <div className="custom-file-browser">
      {/* Custom UI using hook data and actions */}
    </div>
  );
}
```

### **Advanced Playlist Creator Features**

```tsx
function AdvancedPlaylistCreator() {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [metadata, setMetadata] = useState<PlaylistMetadata>({
    id: 'playlist-1',
    name: 'My Awesome Playlist',
    description: 'A collection of great tracks',
    tags: ['rock', 'favorites'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return (
    <EnhancedPlaylistCreator
      events={events}
      initialTracks={tracks}
      initialMetadata={metadata}
      enableAdvancedFeatures={true}
      enableTemplates={true}
      enableCollaboration={false}
      onPlaylistCreated={(path, meta) => {
        console.log('Created:', path, meta);
        // Handle playlist creation
      }}
      onPlaylistLoaded={(meta, tracks) => {
        console.log('Loaded:', meta, tracks);
        // Handle playlist loading
      }}
    />
  );
}
```

## 🎨 UI Customization

### **Custom Styling**

```tsx
<EnhancedFileBrowser
  className="custom-file-browser"
  height="h-[600px]"
  compact={false}
  showToolbar={true}
  viewMode="grid"
  style={{
    '--file-browser-accent': '#3b82f6',
    '--file-browser-radius': '8px',
  }}
/>
```

### **Theme Integration**

```css
.custom-file-browser {
  --file-browser-bg: hsl(var(--background));
  --file-browser-border: hsl(var(--border));
  --file-browser-accent: hsl(var(--primary));
  --file-browser-muted: hsl(var(--muted));
}
```

## 🔌 Integration Examples

### **1. Media Player Integration**

```tsx
// Replace existing file browser in media player
import EnhancedFileBrowser from '@/components/enhanced-file-browser';

function MediaPlayerPage() {
  const [currentPlaylist, setCurrentPlaylist] = useState<string[]>([]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <EnhancedFileBrowser
        onFileSelect={(path) => setCurrentPlaylist([path])}
        onMultiSelect={setCurrentPlaylist}
        mediaOnly={true}
        compact={true}
        height="h-[400px]"
      />
      <MediaPlayer playlist={currentPlaylist} />
    </div>
  );
}
```

### **2. Full Playlist Management System**

```tsx
function PlaylistManagementSystem() {
  const [playlists, setPlaylists] = useState<PlaylistMetadata[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<string | null>(null);

  return (
    <div className="h-screen flex">
      {/* Playlist Sidebar */}
      <aside className="w-64 border-r">
        <PlaylistList
          playlists={playlists}
          currentPlaylist={currentPlaylist}
          onPlaylistSelect={setCurrentPlaylist}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <EnhancedPlaylistCreator
          events={events}
          enableAdvancedFeatures={true}
          onPlaylistCreated={(path, metadata) => {
            setPlaylists(prev => [...prev, metadata]);
          }}
        />
      </main>
    </div>
  );
}
```

### **3. Event-Driven Playlist Creation**

```tsx
function EventPlaylistCreator({ eventId }: { eventId: string }) {
  const event = events.find(e => e.uid === eventId);
  
  const initialMetadata = {
    eventId,
    eventName: event?.summary,
    name: event?.summary.replace(/[^a-zA-Z0-9]/g, '_'),
    description: `Playlist for ${event?.summary}`,
    tags: ['event', 'auto-generated'],
  };

  return (
    <EnhancedPlaylistCreator
      events={[event].filter(Boolean)}
      initialMetadata={initialMetadata}
      enableAdvancedFeatures={true}
      onPlaylistCreated={(path, metadata) => {
        // Link playlist to event in database
        linkPlaylistToEvent(eventId, path, metadata);
      }}
    />
  );
}
```

## 🎹 Keyboard Shortcuts

The enhanced components include comprehensive keyboard shortcuts:

### **File Browser Shortcuts**
- `Alt + ←` - Navigate back
- `Alt + →` - Navigate forward  
- `Alt + ↑` - Navigate up one level
- `Ctrl + Home` - Navigate to home directory
- `F5` - Refresh current directory
- `Ctrl + A` - Select all media files
- `Escape` - Clear selection
- `Enter` - Open selected item
- `Space` - Toggle selection

### **Playlist Creator Shortcuts**
- `Ctrl + S` - Save playlist
- `Ctrl + N` - New playlist
- `Ctrl + O` - Open playlist
- `Delete` - Remove selected tracks
- `Ctrl + D` - Duplicate selected tracks
- `Ctrl + F` - Focus search
- `Ctrl + A` - Select all tracks

## 📊 Performance Optimizations

### **File Browser Optimizations**
```tsx
const {
  currentContents,
  getFilteredItems,
} = useFileBrowser({
  mediaOnly: true,
  persistSelection: false, // Disable if not needed
});

// Only render visible items
const visibleItems = useMemo(() => {
  return getFilteredItems().slice(0, 100); // Limit rendering
}, [getFilteredItems]);
```

### **Playlist Creator Optimizations**
```tsx
// Use React.memo for track items
const TrackItem = React.memo(({ track, onRemove }) => {
  return (
    <div className="track-item">
      {/* Track content */}
    </div>
  );
});

// Virtualize large playlists
import { FixedSizeList as List } from 'react-window';

const VirtualizedPlaylist = ({ tracks }) => (
  <List
    height={400}
    itemCount={tracks.length}
    itemSize={60}
  >
    {({ index, style }) => (
      <div style={style}>
        <TrackItem track={tracks[index]} />
      </div>
    )}
  </List>
);
```

## 🔧 API Integration

### **Custom File Browser Service**

```tsx
// Extend the file browser service
class CustomFileBrowserService extends FileBrowserService {
  static async getMediaMetadata(filePath: string) {
    const response = await fetch(`/api/media/metadata?path=${filePath}`);
    return response.json();
  }

  static async generateThumbnail(filePath: string) {
    const response = await fetch(`/api/media/thumbnail?path=${filePath}`);
    return response.blob();
  }
}

// Use in component
const { browseDirectory } = useFileBrowser({
  customService: CustomFileBrowserService,
});
```

### **Enhanced Playlist Service**

```tsx
// Add metadata support to playlist service
interface EnhancedPlaylistCreateRequest {
  name: string;
  tracks: string[];
  savePath: string;
  metadata?: {
    description?: string;
    tags?: string[];
    coverImage?: string;
    trackMetadata?: TrackMetadata[];
  };
}

class EnhancedPlaylistService extends PlaylistService {
  static async createPlaylistWithMetadata(request: EnhancedPlaylistCreateRequest) {
    // Enhanced implementation with metadata support
    const response = await fetch('/api/playlists/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  }
}
```

## 🧪 Testing

### **File Browser Tests**

```tsx
import { renderHook, act } from '@testing-library/react';
import { useFileBrowser } from '@/hooks/use-file-browser';

describe('useFileBrowser', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileBrowser());
    
    expect(result.current.currentContents).toBeNull();
    expect(result.current.selectedFiles.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle file selection', async () => {
    const { result } = renderHook(() => useFileBrowser());
    
    await act(async () => {
      result.current.toggleFileSelection('/path/to/file.mp3');
    });
    
    expect(result.current.selectedFiles.has('/path/to/file.mp3')).toBe(true);
  });
});
```

### **Component Integration Tests**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedPlaylistCreator from '@/components/enhanced-playlist-creator';

describe('EnhancedPlaylistCreator', () => {
  it('should create a playlist', async () => {
    const mockOnPlaylistCreated = jest.fn();
    
    render(
      <EnhancedPlaylistCreator
        events={[]}
        onPlaylistCreated={mockOnPlaylistCreated}
      />
    );
    
    // Add tracks and create playlist
    fireEvent.change(screen.getByLabelText('Playlist Name'), {
      target: { value: 'Test Playlist' }
    });
    
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockOnPlaylistCreated).toHaveBeenCalled();
    });
  });
});
```

## 🎯 Migration Guide

### **From Original to Enhanced**

```tsx
// Old implementation
import FileBrowser from '@/components/media-player/file-browser';
import PlaylistCreator from '@/components/media-player/playlist-creator';

// New implementation
import EnhancedFileBrowser from '@/components/enhanced-file-browser';
import EnhancedPlaylistCreator from '@/components/enhanced-playlist-creator';

// Migration steps:
// 1. Replace imports
// 2. Update prop names (mostly compatible)
// 3. Add new features as needed
// 4. Test functionality
```

### **Prop Mapping**

```tsx
// Old FileBrowser props → New EnhancedFileBrowser props
{
  onFileSelect,           // ✅ Same
  onPlaylistSelect,       // → onMultiSelect
  onPlaylistFileSelect,   // ✅ Same
  mediaOnly,              // ✅ Same
  compact,                // ✅ Same
  // New props:
  showToolbar: true,
  showBulkActions: true,
  allowDragDrop: true,
  viewMode: 'list',
  height: 'h-[600px]',
}

// Old PlaylistCreator props → New EnhancedPlaylistCreator props
{
  events,                 // ✅ Same
  onPlaylistCreated,      // ✅ Enhanced with metadata
  // New props:
  enableAdvancedFeatures: true,
  enableTemplates: true,
  initialTracks: [],
  initialMetadata: {},
}
```

## 🚀 Production Deployment

### **Performance Considerations**

1. **Lazy Loading**: Load components only when needed
2. **Virtualization**: Use for large file lists and playlists
3. **Caching**: Implement file metadata caching
4. **Debouncing**: Debounce search and filter operations
5. **Memory Management**: Clean up listeners and timers

### **Error Boundaries**

```tsx
class FileBrowserErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('File browser error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong with the file browser.</div>;
    }

    return this.props.children;
  }
}
```

### **Monitoring and Analytics**

```tsx
// Track usage metrics
const useAnalytics = () => {
  const trackEvent = (event: string, data: any) => {
    // Send to analytics service
    analytics.track(event, data);
  };

  return { trackEvent };
};

// Use in components
const { trackEvent } = useAnalytics();

const handleFileSelect = (filePath: string) => {
  trackEvent('file_selected', { filePath, timestamp: Date.now() });
  // Handle file selection
};
```

## 📝 Summary

The enhanced playlist creator and file browser provide a complete solution for media management with:

✅ **Robust Architecture**: Built with TypeScript, React hooks, and modern patterns  
✅ **Advanced Features**: Drag-drop, search, filtering, metadata management  
✅ **Excellent UX**: Keyboard shortcuts, error handling, loading states  
✅ **Extensible**: Easy to customize and extend for specific needs  
✅ **Production Ready**: Comprehensive error handling and performance optimizations  
✅ **Backward Compatible**: Easy migration from existing components  

The implementation maintains the familiar interface while adding powerful new capabilities, making it a comprehensive upgrade to your existing media management system.