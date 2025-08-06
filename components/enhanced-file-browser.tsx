"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFileBrowser, FileBrowserOptions } from "@/hooks/use-file-browser";
import { FileItem } from "@/services/file-browser.service";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  File,
  FileMusic,
  Folder,
  FolderOpen,
  HardDrive,
  Home,
  Music,
  Play,
  Search,
  Video,
  X,
  Grid3X3,
  List,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Copy,
  SelectAll,
  Filter,
} from "lucide-react";

interface EnhancedFileBrowserProps extends FileBrowserOptions {
  onFileSelect?: (filePath: string) => void;
  onMultiSelect?: (filePaths: string[]) => void;
  onPlaylistFileSelect?: (playlistPath: string) => void;
  onDirectoryChange?: (path: string) => void;
  compact?: boolean;
  showToolbar?: boolean;
  showBulkActions?: boolean;
  allowDragDrop?: boolean;
  viewMode?: 'list' | 'grid';
  className?: string;
  height?: string;
}

interface FileIconProps {
  item: FileItem;
  size?: 'sm' | 'md' | 'lg';
}

const FileIcon: React.FC<FileIconProps> = ({ item, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-6 w-6'
  };

  if (item.isDirectory) {
    return <Folder className={`${sizeClasses[size]} text-blue-500`} />;
  }

  const ext = item.extension.toLowerCase().replace('.', '');
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv'];
  const playlistExtensions = ['m3u', 'm3u8', 'pls'];
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus'];

  if (playlistExtensions.includes(ext)) {
    return <FileMusic className={`${sizeClasses[size]} text-orange-500`} />;
  } else if (videoExtensions.includes(ext)) {
    return <Video className={`${sizeClasses[size]} text-purple-500`} />;
  } else if (audioExtensions.includes(ext)) {
    return <Music className={`${sizeClasses[size]} text-green-500`} />;
  } else {
    return <File className={`${sizeClasses[size]} text-muted-foreground`} />;
  }
};

export default function EnhancedFileBrowser({
  onFileSelect,
  onMultiSelect,
  onPlaylistFileSelect,
  onDirectoryChange,
  compact = false,
  showToolbar = true,
  showBulkActions = true,
  allowDragDrop = true,
  viewMode: initialViewMode = 'list',
  className = '',
  height = 'h-[600px]',
  ...fileBrowserOptions
}: EnhancedFileBrowserProps) {
  const [viewMode, setViewMode] = React.useState(initialViewMode);
  const [draggedFiles, setDraggedFiles] = React.useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    // State
    currentContents,
    drives,
    isLoading,
    isSearching,
    searchQuery,
    searchResults,
    selectedFiles,
    error,
    
    // Navigation
    navigateBack,
    navigateForward,
    navigateUp,
    navigateHome,
    browseDirectory,
    
    // Search
    searchFiles,
    clearSearch,
    setSearchQuery,
    
    // Selection
    toggleFileSelection,
    selectFiles,
    clearSelection,
    selectAllMedia,
    
    // Utility
    refresh,
    clearError,
    isMediaFile,
    isPlaylistFile,
    getFilteredItems,
    
    // Computed
    canGoBack,
    canGoForward,
    canGoUp,
    hasSelection,
    selectedCount,
    selectedPaths,
  } = useFileBrowser(fileBrowserOptions);

  // Notify parent of directory changes
  useEffect(() => {
    if (currentContents && onDirectoryChange) {
      onDirectoryChange(currentContents.currentPath);
    }
  }, [currentContents, onDirectoryChange]);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // Handle item interactions
  const handleItemClick = useCallback((item: FileItem) => {
    if (item.isDirectory) {
      browseDirectory(item.path);
    } else if (isPlaylistFile(item)) {
      onPlaylistFileSelect?.(item.path);
    } else if (isMediaFile(item)) {
      onFileSelect?.(item.path);
    }
  }, [browseDirectory, isPlaylistFile, isMediaFile, onPlaylistFileSelect, onFileSelect]);

  const handleItemDoubleClick = useCallback((item: FileItem) => {
    if (isPlaylistFile(item)) {
      onPlaylistFileSelect?.(item.path);
    } else if (isMediaFile(item)) {
      // For media files, select all media in directory
      const mediaFiles = getFilteredItems()
        .filter(i => !i.isDirectory && isMediaFile(i))
        .map(i => i.path);
      onMultiSelect?.(mediaFiles);
    }
  }, [isPlaylistFile, isMediaFile, onPlaylistFileSelect, onMultiSelect, getFilteredItems]);

  const handleBulkAction = useCallback((action: string) => {
    switch (action) {
      case 'select-all':
        selectAllMedia();
        break;
      case 'clear':
        clearSelection();
        break;
      case 'add-to-playlist':
        if (hasSelection) {
          onMultiSelect?.(selectedPaths);
        }
        break;
      default:
        break;
    }
  }, [selectAllMedia, clearSelection, hasSelection, onMultiSelect, selectedPaths]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Only handle if file browser is focused
      if (!scrollAreaRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case 'ArrowUp':
          if (event.altKey) {
            event.preventDefault();
            navigateUp();
          }
          break;
        case 'ArrowLeft':
          if (event.altKey) {
            event.preventDefault();
            navigateBack();
          }
          break;
        case 'ArrowRight':
          if (event.altKey) {
            event.preventDefault();
            navigateForward();
          }
          break;
        case 'Home':
          if (event.ctrlKey) {
            event.preventDefault();
            navigateHome();
          }
          break;
        case 'F5':
          event.preventDefault();
          refresh();
          break;
        case 'a':
          if (event.ctrlKey) {
            event.preventDefault();
            selectAllMedia();
          }
          break;
        case 'Escape':
          clearSelection();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [navigateUp, navigateBack, navigateForward, navigateHome, refresh, selectAllMedia, clearSelection]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: React.DragEvent, item: FileItem) => {
    if (!allowDragDrop) return;

    const filesToDrag = selectedFiles.has(item.path) ? selectedPaths : [item.path];
    setDraggedFiles(filesToDrag);
    event.dataTransfer.setData('text/plain', JSON.stringify(filesToDrag));
    event.dataTransfer.effectAllowed = 'copy';
  }, [allowDragDrop, selectedFiles, selectedPaths]);

  const handleDragEnd = useCallback(() => {
    setDraggedFiles([]);
  }, []);

  // Get filtered items
  const filteredItems = getFilteredItems();

  // Render navigation toolbar
  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateBack}
                  disabled={!canGoBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back (Alt+←)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateForward}
                  disabled={!canGoForward}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go forward (Alt+→)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateUp}
                  disabled={!canGoUp}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go up (Alt+↑)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateHome}
                >
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go home (Ctrl+Home)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh (F5)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk Actions */}
          {showBulkActions && hasSelection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {selectedCount} selected
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction('add-to-playlist')}>
                  <Music className="h-4 w-4 mr-2" />
                  Add to Playlist
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('select-all')}>
                  <SelectAll className="h-4 w-4 mr-2" />
                  Select All Media
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('clear')}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  // Render search bar
  const renderSearchBar = () => (
    <div className="p-3 border-b">
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => searchFiles()}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        {searchResults.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearSearch}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Render file list
  const renderFileList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          {searchResults.length === 0 && searchQuery
            ? 'No files found'
            : 'No items in this directory'}
        </div>
      );
    }

    const isGridMode = viewMode === 'grid' && !compact;

    if (isGridMode) {
      return (
        <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-4">
          {filteredItems.map((item) => (
            <div
              key={item.path}
              className={`flex flex-col items-center p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors ${
                selectedFiles.has(item.path) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => handleItemDoubleClick(item)}
              draggable={allowDragDrop && (isMediaFile(item) || isPlaylistFile(item))}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
            >
              <FileIcon item={item} size="lg" />
              <span className="text-xs text-center mt-2 truncate w-full">
                {item.name}
              </span>
              {(isMediaFile(item) || isPlaylistFile(item)) && (
                <Checkbox
                  checked={selectedFiles.has(item.path)}
                  onCheckedChange={() => toggleFileSelection(item.path)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1 p-2">
        {/* System Drives (show only if at root) */}
        {!currentContents?.currentPath &&
          drives.map((drive) => (
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
              selectedFiles.has(item.path) ? 'bg-accent' : ''
            }`}
            onClick={() => handleItemClick(item)}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (isMediaFile(item) || isPlaylistFile(item)) {
                toggleFileSelection(item.path);
              }
            }}
            draggable={allowDragDrop && (isMediaFile(item) || isPlaylistFile(item))}
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
          >
            <FileIcon item={item} />

            <div className="flex-1 min-w-0 ml-3">
              <div className="truncate">{item.name}</div>
              {!item.isDirectory && (
                <div className="text-xs text-muted-foreground flex items-center space-x-2">
                  <span>{formatFileSize(item.size)}</span>
                  <span className="uppercase">{item.extension.replace('.', '')}</span>
                  {isPlaylistFile(item) && (
                    <Badge variant="outline" className="text-xs">Playlist</Badge>
                  )}
                </div>
              )}
            </div>

            {(isMediaFile(item) || isPlaylistFile(item)) && (
              <div className="flex items-center space-x-2">
                {isPlaylistFile(item) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaylistFileSelect?.(item.path);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {(isMediaFile(item) || isPlaylistFile(item)) && (
                  <Checkbox
                    checked={selectedFiles.has(item.path)}
                    onCheckedChange={() => toggleFileSelection(item.path)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Error display
  if (error) {
    return (
      <Card className={`${height} ${className}`}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-destructive mb-2">Error loading files</div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={clearError}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`${height} flex flex-col bg-background ${className}`}>
        {renderToolbar()}
        {renderSearchBar()}
        
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          {renderFileList()}
        </ScrollArea>

        {/* Current Path */}
        <div className="p-2 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground truncate">
            {currentContents?.currentPath || 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  // Full file browser
  return (
    <Card className={`${height} flex flex-col ${className}`}>
      <CardHeader className="pb-0 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            File Browser
          </div>
          {hasSelection && (
            <Badge variant="outline">
              {selectedCount} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {renderToolbar()}
        {renderSearchBar()}
        
        {/* Current Path */}
        <div className="px-3 py-2 border-b bg-muted/10">
          <div className="text-sm text-muted-foreground truncate">
            {currentContents?.currentPath || 'Loading...'}
          </div>
        </div>

        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          {renderFileList()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}