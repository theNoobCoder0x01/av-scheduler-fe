"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DirectoryContents,
  FileBrowserService,
  FileItem,
  SystemDrive
} from "@/services/file-browser.service";
import {
  ChevronLeft,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  HardDrive,
  Home,
  Music,
  Play,
  Search,
  Video
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FileBrowserProps {
  onFileSelect?: (filePath: string) => void;
  onPlaylistSelect?: (files: string[]) => void;
  mediaOnly?: boolean;
}

export default function FileBrowser({ onFileSelect, onPlaylistSelect, mediaOnly = false }: FileBrowserProps) {
  const [currentContents, setCurrentContents] = useState<DirectoryContents | null>(null);
  const [drives, setDrives] = useState<SystemDrive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Enhanced media extensions
  const mediaExtensions = [
    // Video formats
    'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v',
    'mpg', 'mpeg', 'ogv', 'ts', 'mts', 'm2ts', 'vob', 'rm', 'rmvb', 'asf',
    'divx', 'xvid', 'f4v', 'm2v', 'mxf', 'roq', 'nsv',
    
    // Audio formats
    'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus', 'amr', 'ac3', 'dts',
    'ape', 'au', 'ra', 'tta', 'tak', 'mpc', 'wv', 'spx', 'gsm', 'aiff',
    'caf', 'w64', 'rf64', 'voc', 'ircam', 'w64', 'mat4', 'mat5', 'pvf',
    'xi', 'htk', 'sds', 'avr', 'wavex', 'sd2', 'flac', 'caf', 'fap',
    
    // Streaming formats
    'm3u8', 'ts', 'webm', 'ogv'
  ];

  // Load initial data
  useEffect(() => {
    loadDrives();
    browseDirectory();
  }, []);

  const loadDrives = async () => {
    try {
      const systemDrives = await FileBrowserService.getSystemDrives();
      setDrives(systemDrives);
    } catch (error) {
      console.error("Error loading drives:", error);
    }
  };

  const browseDirectory = async (path?: string) => {
    setIsLoading(true);
    try {
      const contents = await FileBrowserService.browseDirectory(path);
      setCurrentContents(contents);
      
      // Update navigation history
      if (path && path !== navigationHistory[historyIndex]) {
        const newHistory = navigationHistory.slice(0, historyIndex + 1);
        newHistory.push(path);
        setNavigationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch (error) {
      console.error("Error browsing directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const previousPath = navigationHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      browseDirectory(previousPath);
    }
  };

  const navigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextPath = navigationHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      browseDirectory(nextPath);
    }
  };

  const navigateUp = () => {
    if (currentContents?.parentPath) {
      browseDirectory(currentContents.parentPath);
    }
  };

  const isMediaFile = (item: FileItem) => {
    const ext = item.extension.toLowerCase().replace('.', '');
    return mediaExtensions.includes(ext);
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    
    const ext = item.extension.toLowerCase().replace('.', '');
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv'];
    
    if (videoExtensions.includes(ext)) {
      return <Video className="h-4 w-4 text-purple-500" />;
    } else if (isMediaFile(item)) {
      return <Music className="h-4 w-4 text-green-500" />;
    } else {
      return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      browseDirectory(item.path);
    } else if (isMediaFile(item)) {
      onFileSelect?.(item.path);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (isMediaFile(item)) {
      // Get all media files in current directory for playlist
      const mediaFiles = currentContents?.items
        .filter(i => isMediaFile(i))
        .map(i => i.path) || [];
      
      const startIndex = mediaFiles.indexOf(item.path);
      onPlaylistSelect?.(mediaFiles);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const playSelectedFiles = () => {
    const selectedPaths = Array.from(selectedFiles);
    if (selectedPaths.length > 0) {
      onPlaylistSelect?.(selectedPaths);
      setSelectedFiles(new Set());
    }
  };

  const searchFiles = async () => {
    if (!searchQuery.trim() || !currentContents) return;

    setIsSearching(true);
    try {
      const results = await FileBrowserService.searchFiles(
        currentContents.currentPath,
        searchQuery,
        mediaOnly
      );
      setSearchResults(results.results);
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const displayItems = searchResults.length > 0 ? searchResults : currentContents?.items || [];
  const filteredItems = mediaOnly ? displayItems.filter(item => item.isDirectory || isMediaFile(item)) : displayItems;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>File Browser</span>
          {selectedFiles.size > 0 && (
            <Button size="sm" onClick={playSelectedFiles}>
              <Play className="h-4 w-4 mr-2" />
              Play Selected ({selectedFiles.size})
            </Button>
          )}
        </CardTitle>
        
        {/* Navigation Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={navigateBack}
            disabled={historyIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateForward}
            disabled={historyIndex >= navigationHistory.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateUp}
            disabled={!currentContents?.parentPath}
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Path */}
        <div className="text-sm text-muted-foreground truncate">
          {currentContents?.currentPath || "Loading..."}
        </div>

        {/* Search */}
        <div className="flex space-x-2">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchFiles()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={searchFiles}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          {searchResults.length > 0 && (
            <Button variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>

        {/* Supported Formats Info */}
        {mediaOnly && (
          <div className="text-xs text-muted-foreground">
            <p>Supported formats: MP3, MP4, WebM, MOV, AVI, MKV, WAV, FLAC, AAC, and many more</p>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {/* System Drives (show only if at root) */}
              {!currentContents?.currentPath && drives.map((drive) => (
                <div
                  key={drive.path}
                  className="flex items-center p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => browseDirectory(drive.path)}
                >
                  <HardDrive className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="flex-1">{drive.name}</span>
                  <span className="text-xs text-muted-foreground">{drive.type}</span>
                </div>
              ))}

              {/* Directory Contents */}
              {filteredItems.map((item) => (
                <div
                  key={item.path}
                  className={`flex items-center p-2 rounded hover:bg-accent cursor-pointer ${
                    selectedFiles.has(item.path) ? "bg-accent" : ""
                  }`}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (isMediaFile(item)) {
                      toggleFileSelection(item.path);
                    }
                  }}
                >
                  {getFileIcon(item)}
                  
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="truncate">{item.name}</div>
                    {!item.isDirectory && (
                      <div className="text-xs text-muted-foreground flex items-center space-x-2">
                        <span>{formatFileSize(item.size)}</span>
                        <span className="uppercase">{item.extension.replace('.', '')}</span>
                      </div>
                    )}
                  </div>
                  
                  {isMediaFile(item) && (
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(item.path)}
                      onChange={() => toggleFileSelection(item.path)}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2"
                    />
                  )}
                </div>
              ))}

              {filteredItems.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-8">
                  {searchResults.length === 0 && searchQuery ? "No files found" : "No items in this directory"}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}