import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  FileBrowserService, 
  FileItem, 
  DirectoryContents, 
  SystemDrive,
  SearchResult 
} from '@/services/file-browser.service';
import { useToast } from '@/hooks/use-toast';

export interface FileBrowserOptions {
  mediaOnly?: boolean;
  multiSelect?: boolean;
  autoSelectPlaylists?: boolean;
  persistSelection?: boolean;
  initialPath?: string;
}

export interface FileBrowserState {
  // Navigation
  currentContents: DirectoryContents | null;
  drives: SystemDrive[];
  navigationHistory: string[];
  historyIndex: number;
  
  // Loading states
  isLoading: boolean;
  isSearching: boolean;
  
  // Search
  searchQuery: string;
  searchResults: FileItem[];
  
  // Selection
  selectedFiles: Set<string>;
  
  // Error handling
  error: string | null;
}

export interface FileBrowserActions {
  // Navigation
  browseDirectory: (path?: string) => Promise<void>;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateUp: () => void;
  navigateHome: () => void;
  
  // Search
  searchFiles: (query?: string) => Promise<void>;
  clearSearch: () => void;
  setSearchQuery: (query: string) => void;
  
  // Selection
  toggleFileSelection: (filePath: string) => void;
  selectFiles: (filePaths: string[]) => void;
  clearSelection: () => void;
  selectAllMedia: () => void;
  
  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

const SUPPORTED_MEDIA_EXTENSIONS = [
  // Video formats
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v',
  'mpg', 'mpeg', 'ogv', 'ts', 'mts', 'm2ts', 'vob', 'rm', 'rmvb', 'asf',
  'divx', 'xvid', 'f4v', 'm2v', 'mxf', 'roq', 'nsv',
  
  // Audio formats
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus', 'amr', 'ac3', 'dts',
  'ape', 'au', 'ra', 'tta', 'tak', 'mpc', 'wv', 'spx', 'gsm', 'aiff',
  'caf', 'w64', 'rf64', 'voc', 'ircam', 'mat4', 'mat5', 'pvf', 'xi',
  'htk', 'sds', 'avr', 'wavex', 'sd2', 'fap',
  
  // Streaming formats
  'm3u8', 'webm', 'ogv'
];

const PLAYLIST_EXTENSIONS = ['m3u', 'm3u8', 'pls'];

export function useFileBrowser(options: FileBrowserOptions = {}) {
  const {
    mediaOnly = false,
    multiSelect = true,
    autoSelectPlaylists = false,
    persistSelection = true,
    initialPath
  } = options;

  const { toast } = useToast();
  const mountedRef = useRef(true);

  // State
  const [currentContents, setCurrentContents] = useState<DirectoryContents | null>(null);
  const [drives, setDrives] = useState<SystemDrive[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Utility functions
  const isMediaFile = useCallback((item: FileItem): boolean => {
    const ext = item.extension.toLowerCase().replace('.', '');
    return SUPPORTED_MEDIA_EXTENSIONS.includes(ext);
  }, []);

  const isPlaylistFile = useCallback((item: FileItem): boolean => {
    const ext = item.extension.toLowerCase().replace('.', '');
    return PLAYLIST_EXTENSIONS.includes(ext);
  }, []);

  const handleError = useCallback((error: unknown, operation: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`File Browser Error (${operation}):`, error);
    setError(message);
    toast({
      title: `Error: ${operation}`,
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load system drives
  const loadDrives = useCallback(async () => {
    try {
      const systemDrives = await FileBrowserService.getSystemDrives();
      if (mountedRef.current) {
        setDrives(systemDrives);
      }
    } catch (error) {
      handleError(error, 'Loading drives');
    }
  }, [handleError]);

  // Browse directory
  const browseDirectory = useCallback(async (path?: string) => {
    setIsLoading(true);
    clearError();
    
    try {
      const contents = await FileBrowserService.browseDirectory(path);
      
      if (!mountedRef.current) return;
      
      setCurrentContents(contents);

      // Update navigation history
      if (path) {
        const newHistory = navigationHistory.slice(0, historyIndex + 1);
        if (newHistory[newHistory.length - 1] !== path) {
          newHistory.push(path);
          setNavigationHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      } else if (navigationHistory.length === 0) {
        const homeDir = contents.currentPath;
        setNavigationHistory([homeDir]);
        setHistoryIndex(0);
      }

      // Auto-select playlists if enabled
      if (autoSelectPlaylists && contents.items) {
        const playlistFiles = contents.items
          .filter(item => !item.isDirectory && isPlaylistFile(item))
          .map(item => item.path);
        
        if (playlistFiles.length > 0) {
          setSelectedFiles(new Set(playlistFiles));
        }
      }

    } catch (error) {
      handleError(error, 'Browsing directory');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [navigationHistory, historyIndex, autoSelectPlaylists, isPlaylistFile, handleError, clearError]);

  // Navigation functions
  const navigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const previousPath = navigationHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setIsLoading(true);
      FileBrowserService.browseDirectory(previousPath)
        .then((contents) => {
          if (mountedRef.current) {
            setCurrentContents(contents);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          handleError(error, 'Navigating back');
          if (mountedRef.current) {
            setIsLoading(false);
          }
        });
    }
  }, [historyIndex, navigationHistory, handleError]);

  const navigateForward = useCallback(() => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextPath = navigationHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setIsLoading(true);
      FileBrowserService.browseDirectory(nextPath)
        .then((contents) => {
          if (mountedRef.current) {
            setCurrentContents(contents);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          handleError(error, 'Navigating forward');
          if (mountedRef.current) {
            setIsLoading(false);
          }
        });
    }
  }, [historyIndex, navigationHistory, handleError]);

  const navigateUp = useCallback(() => {
    if (currentContents?.parentPath) {
      browseDirectory(currentContents.parentPath);
    }
  }, [currentContents, browseDirectory]);

  const navigateHome = useCallback(() => {
    const homeDir = drives.find(
      (drive) => drive.type === 'folder' && drive.name === 'Home'
    );
    if (homeDir) {
      browseDirectory(homeDir.path);
    } else {
      const firstDrive = drives[0];
      if (firstDrive) {
        browseDirectory(firstDrive.path);
      }
    }
  }, [drives, browseDirectory]);

  // Search functionality
  const searchFiles = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim() || !currentContents) return;

    setIsSearching(true);
    clearError();
    
    try {
      const results = await FileBrowserService.searchFiles(
        currentContents.currentPath,
        searchTerm,
        mediaOnly
      );
      
      if (mountedRef.current) {
        setSearchResults(results.results);
      }
    } catch (error) {
      handleError(error, 'Searching files');
    } finally {
      if (mountedRef.current) {
        setIsSearching(false);
      }
    }
  }, [searchQuery, currentContents, mediaOnly, handleError, clearError]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Selection functions
  const toggleFileSelection = useCallback((filePath: string) => {
    if (!multiSelect) {
      setSelectedFiles(new Set([filePath]));
      return;
    }

    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(filePath)) {
        newSelection.delete(filePath);
      } else {
        newSelection.add(filePath);
      }
      return newSelection;
    });
  }, [multiSelect]);

  const selectFiles = useCallback((filePaths: string[]) => {
    if (multiSelect) {
      setSelectedFiles(prev => {
        const newSelection = new Set(prev);
        filePaths.forEach(path => newSelection.add(path));
        return newSelection;
      });
    } else {
      setSelectedFiles(new Set(filePaths.slice(0, 1)));
    }
  }, [multiSelect]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  const selectAllMedia = useCallback(() => {
    if (!currentContents) return;
    
    const mediaFiles = currentContents.items
      .filter(item => !item.isDirectory && (isMediaFile(item) || isPlaylistFile(item)))
      .map(item => item.path);
    
    selectFiles(mediaFiles);
  }, [currentContents, isMediaFile, isPlaylistFile, selectFiles]);

  // Refresh current directory
  const refresh = useCallback(async () => {
    if (currentContents) {
      await browseDirectory(currentContents.currentPath);
    } else {
      await browseDirectory();
    }
  }, [currentContents, browseDirectory]);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      await loadDrives();
      if (initialPath) {
        await browseDirectory(initialPath);
      } else {
        await browseDirectory();
      }
    };

    initialize();
  }, [initialPath]); // Only run on mount and when initialPath changes

  // Get filtered items based on search and media-only settings
  const getFilteredItems = useCallback(() => {
    const displayItems = searchResults.length > 0 ? searchResults : currentContents?.items || [];
    
    if (mediaOnly) {
      return displayItems.filter(
        item => item.isDirectory || isMediaFile(item) || isPlaylistFile(item)
      );
    }
    
    return displayItems;
  }, [searchResults, currentContents, mediaOnly, isMediaFile, isPlaylistFile]);

  // State object
  const state: FileBrowserState = {
    currentContents,
    drives,
    navigationHistory,
    historyIndex,
    isLoading,
    isSearching,
    searchQuery,
    searchResults,
    selectedFiles,
    error,
  };

  // Actions object
  const actions: FileBrowserActions = {
    browseDirectory,
    navigateBack,
    navigateForward,
    navigateUp,
    navigateHome,
    searchFiles,
    clearSearch,
    setSearchQuery,
    toggleFileSelection,
    selectFiles,
    clearSelection,
    selectAllMedia,
    refresh,
    clearError,
  };

  return {
    ...state,
    ...actions,
    // Utility functions
    isMediaFile,
    isPlaylistFile,
    getFilteredItems,
    // Computed properties
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < navigationHistory.length - 1,
    canGoUp: !!currentContents?.parentPath,
    hasSelection: selectedFiles.size > 0,
    selectedCount: selectedFiles.size,
    selectedPaths: Array.from(selectedFiles),
  };
}