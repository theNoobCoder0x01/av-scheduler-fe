"use client";

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { PlaylistService } from "@/services/playlist.service";
import { SettingsService } from "@/services/settings.service";
import EnhancedFileBrowser from "./enhanced-file-browser";
import {
  Music,
  FileMusic,
  FolderOpen,
  Save,
  Download,
  Upload,
  Server,
  Trash2,
  X,
  Plus,
  Copy,
  Edit,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  Clock,
  Hash,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Search,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Info,
  Star,
  Heart,
  Zap,
  Magic,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";

interface PlaylistTrack {
  id: string;
  path: string;
  name: string;
  artist?: string;
  album?: string;
  duration?: number;
  size?: number;
  format?: string;
  bitrate?: string;
  sampleRate?: string;
  addedAt: number;
  playCount?: number;
  lastPlayed?: number;
  isFavorite?: boolean;
  tags?: string[];
  notes?: string;
}

interface PlaylistMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  eventId?: string;
  eventName?: string;
  coverImage?: string;
  isPublic?: boolean;
  tags?: string[];
  estimatedDuration?: number;
  trackCount?: number;
  totalSize?: number;
  lastModified?: number;
  version?: number;
}

interface PlaylistTemplate {
  id: string;
  name: string;
  description: string;
  defaultTracks: string[];
  suggestedDuration: number;
  categories: string[];
  isBuiltIn: boolean;
}

interface EnhancedPlaylistCreatorProps {
  events: ICalendarEvent[];
  onPlaylistCreated?: (playlistPath: string, metadata: PlaylistMetadata) => void;
  onPlaylistLoaded?: (playlist: PlaylistMetadata, tracks: PlaylistTrack[]) => void;
  initialTracks?: PlaylistTrack[];
  initialMetadata?: Partial<PlaylistMetadata>;
  enableAdvancedFeatures?: boolean;
  enableTemplates?: boolean;
  enableCollaboration?: boolean;
}

type SortField = 'name' | 'artist' | 'album' | 'duration' | 'addedAt' | 'format' | 'size';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid' | 'table';
type FilterType = 'all' | 'audio' | 'video' | 'playlist' | 'favorites';

export default function EnhancedPlaylistCreator({
  events,
  onPlaylistCreated,
  onPlaylistLoaded,
  initialTracks = [],
  initialMetadata = {},
  enableAdvancedFeatures = true,
  enableTemplates = true,
  enableCollaboration = false,
}: EnhancedPlaylistCreatorProps) {
  const { toast } = useToast();
  const dragItemRef = useRef<HTMLDivElement>(null);
  const dropTargetRef = useRef<number | null>(null);

  // Core playlist state
  const [tracks, setTracks] = useState<PlaylistTrack[]>(initialTracks);
  const [metadata, setMetadata] = useState<PlaylistMetadata>({
    id: '',
    name: '',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    trackCount: 0,
    totalSize: 0,
    estimatedDuration: 0,
    version: 1,
    ...initialMetadata,
  });

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTrackDetailsDialog, setShowTrackDetailsDialog] = useState(false);
  const [selectedTrackForDetails, setSelectedTrackForDetails] = useState<PlaylistTrack | null>(null);

  // Advanced features state
  const [enableAutoSave, setEnableAutoSave] = useState(false);
  const [enableSmartSuggestions, setEnableSmartSuggestions] = useState(true);
  const [enableCrossfade, setEnableCrossfade] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [enableGaplessPlayback, setEnableGaplessPlayback] = useState(true);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Settings
  const [defaultPlaylistPath, setDefaultPlaylistPath] = useState<string>('');
  const [saveMethod, setSaveMethod] = useState<'download' | 'server'>('server');
  const [saveLocation, setSaveLocation] = useState<string>('');

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SettingsService.getSettings();
        setDefaultPlaylistPath(settings.playlistFolderPath);
        setSaveLocation(settings.playlistFolderPath);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Auto-generate playlist name from event
  useEffect(() => {
    if (metadata.eventId && events.length > 0) {
      const event = events.find(e => e.uid === metadata.eventId);
      if (event && !metadata.name) {
        const cleanName = event.summary.replace(/[<>:"/\\|?*]/g, '_');
        setMetadata(prev => ({
          ...prev,
          name: cleanName,
          eventName: event.summary,
        }));
      }
    }
  }, [metadata.eventId, events, metadata.name]);

  // Update metadata when tracks change
  useEffect(() => {
    const trackCount = tracks.length;
    const totalSize = tracks.reduce((sum, track) => sum + (track.size || 0), 0);
    const estimatedDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

    setMetadata(prev => ({
      ...prev,
      trackCount,
      totalSize,
      estimatedDuration,
      updatedAt: Date.now(),
    }));
  }, [tracks]);

  // Format utilities
  const formatDuration = useCallback((seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  }, []);

  // File handling
  const handleFileSelect = useCallback((filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const newTrack: PlaylistTrack = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path: filePath,
      name: fileName,
      format: fileExtension,
      addedAt: Date.now(),
      playCount: 0,
      isFavorite: false,
      tags: [],
    };

    // Check for duplicates
    const isDuplicate = tracks.some(track => track.path === filePath);
    if (isDuplicate) {
      toast({
        title: 'Track already exists',
        description: `"${fileName}" is already in the playlist`,
        variant: 'destructive',
      });
      return;
    }

    setTracks(prev => [...prev, newTrack]);
    toast({
      title: 'Track added',
      description: `Added "${fileName}" to playlist`,
    });
  }, [tracks, toast]);

  const handleMultiSelect = useCallback((filePaths: string[]) => {
    const newTracks: PlaylistTrack[] = filePaths
      .filter(filePath => !tracks.some(track => track.path === filePath))
      .map(filePath => {
        const fileName = filePath.split('/').pop() || filePath;
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          path: filePath,
          name: fileName,
          format: fileExtension,
          addedAt: Date.now(),
          playCount: 0,
          isFavorite: false,
          tags: [],
        };
      });

    if (newTracks.length > 0) {
      setTracks(prev => [...prev, ...newTracks]);
      toast({
        title: 'Tracks added',
        description: `Added ${newTracks.length} tracks to playlist`,
      });
    } else {
      toast({
        title: 'No new tracks',
        description: 'All selected tracks are already in the playlist',
        variant: 'destructive',
      });
    }
  }, [tracks, toast]);

  const handlePlaylistFileSelect = useCallback(async (playlistPath: string) => {
    try {
      setIsLoading(true);
      // Load existing playlist
      const playlistData = await PlaylistService.loadPlaylist(playlistPath);
      
      if (playlistData.tracks) {
        const loadedTracks: PlaylistTrack[] = playlistData.tracks.map((trackPath, index) => ({
          id: `imported-${Date.now()}-${index}`,
          path: trackPath,
          name: trackPath.split('/').pop() || trackPath,
          format: trackPath.split('.').pop()?.toLowerCase() || '',
          addedAt: Date.now() - (tracks.length - index) * 1000, // Stagger timestamps
          playCount: 0,
          isFavorite: false,
          tags: ['imported'],
        }));

        setTracks(prev => [...prev, ...loadedTracks]);
        toast({
          title: 'Playlist imported',
          description: `Imported ${loadedTracks.length} tracks from playlist`,
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import playlist file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tracks.length, toast]);

  // Track management
  const removeTrack = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setTracks(prev => prev.filter(t => t.id !== trackId));
      setSelectedTracks(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
      toast({
        title: 'Track removed',
        description: `Removed "${track.name}" from playlist`,
      });
    }
  }, [tracks, toast]);

  const removeSelectedTracks = useCallback(() => {
    const removedCount = selectedTracks.size;
    setTracks(prev => prev.filter(track => !selectedTracks.has(track.id)));
    setSelectedTracks(new Set());
    toast({
      title: 'Tracks removed',
      description: `Removed ${removedCount} tracks from playlist`,
    });
  }, [selectedTracks, toast]);

  const duplicateTrack = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      const duplicatedTrack: PlaylistTrack = {
        ...track,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${track.name} (Copy)`,
        addedAt: Date.now(),
      };
      
      const originalIndex = tracks.findIndex(t => t.id === trackId);
      setTracks(prev => [
        ...prev.slice(0, originalIndex + 1),
        duplicatedTrack,
        ...prev.slice(originalIndex + 1),
      ]);
      
      toast({
        title: 'Track duplicated',
        description: `Created copy of "${track.name}"`,
      });
    }
  }, [tracks, toast]);

  const toggleTrackFavorite = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, isFavorite: !track.isFavorite }
        : track
    ));
  }, []);

  const clearPlaylist = useCallback(() => {
    setTracks([]);
    setSelectedTracks(new Set());
    setMetadata(prev => ({
      ...prev,
      name: '',
      description: '',
      eventId: undefined,
      eventName: undefined,
      updatedAt: Date.now(),
    }));
    toast({
      title: 'Playlist cleared',
      description: 'All tracks have been removed from the playlist',
    });
  }, [toast]);

  // Drag and drop handling
  const handleDragStart = useCallback((e: React.DragEvent, trackId: string) => {
    setDraggedTrack(trackId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', trackId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTrack(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    const draggedTrackId = e.dataTransfer.getData('text/plain');
    if (!draggedTrackId) return;

    const sourceIndex = tracks.findIndex(t => t.id === draggedTrackId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) return;

    const newTracks = [...tracks];
    const [draggedItem] = newTracks.splice(sourceIndex, 1);
    newTracks.splice(targetIndex, 0, draggedItem);

    setTracks(newTracks);
    setDraggedTrack(null);
    setDragOverIndex(null);
    
    toast({
      title: 'Track moved',
      description: `Moved "${draggedItem.name}" to position ${targetIndex + 1}`,
    });
  }, [tracks, toast]);

  // Sorting and filtering
  const getSortedAndFilteredTracks = useCallback(() => {
    let filteredTracks = tracks;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredTracks = filteredTracks.filter(track =>
        track.name.toLowerCase().includes(query) ||
        track.artist?.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query) ||
        track.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'audio':
        filteredTracks = filteredTracks.filter(track => 
          ['mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus'].includes(track.format || '')
        );
        break;
      case 'video':
        filteredTracks = filteredTracks.filter(track => 
          ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(track.format || '')
        );
        break;
      case 'playlist':
        filteredTracks = filteredTracks.filter(track => 
          ['m3u', 'm3u8', 'pls'].includes(track.format || '')
        );
        break;
      case 'favorites':
        filteredTracks = filteredTracks.filter(track => track.isFavorite);
        break;
      default:
        break;
    }

    // Apply sorting
    filteredTracks.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'artist':
          comparison = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'album':
          comparison = (a.album || '').localeCompare(b.album || '');
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'addedAt':
          comparison = a.addedAt - b.addedAt;
          break;
        case 'format':
          comparison = (a.format || '').localeCompare(b.format || '');
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filteredTracks;
  }, [tracks, searchQuery, filterType, sortField, sortDirection]);

  // Track selection
  const toggleTrackSelection = useCallback((trackId: string) => {
    setSelectedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const selectAllTracks = useCallback(() => {
    const visibleTracks = getSortedAndFilteredTracks();
    setSelectedTracks(new Set(visibleTracks.map(t => t.id)));
  }, [getSortedAndFilteredTracks]);

  const clearSelection = useCallback(() => {
    setSelectedTracks(new Set());
  }, []);

  // Playlist operations
  const validatePlaylist = useCallback(() => {
    if (!metadata.name.trim()) {
      toast({
        title: 'Missing playlist name',
        description: 'Please enter a name for your playlist',
        variant: 'destructive',
      });
      return false;
    }

    if (tracks.length === 0) {
      toast({
        title: 'Empty playlist',
        description: 'Please add at least one track to the playlist',
        variant: 'destructive',
      });
      return false;
    }

    if (saveMethod === 'server' && !saveLocation.trim()) {
      toast({
        title: 'Missing save location',
        description: 'Please select where to save the playlist',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [metadata.name, tracks.length, saveMethod, saveLocation, toast]);

  const createPlaylist = useCallback(async () => {
    if (!validatePlaylist()) return;

    setIsCreating(true);
    try {
      const fileName = metadata.name.endsWith('.m3u')
        ? metadata.name
        : `${metadata.name}.m3u`;

      const trackPaths = tracks.map(track => track.path);

      if (saveMethod === 'server') {
        const result = await PlaylistService.createPlaylist({
          name: fileName,
          tracks: trackPaths,
          savePath: saveLocation,
          eventId: metadata.eventId,
          metadata: {
            description: metadata.description,
            tags: metadata.tags,
            trackMetadata: tracks.map(track => ({
              id: track.id,
              name: track.name,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
              isFavorite: track.isFavorite,
              tags: track.tags,
              notes: track.notes,
            })),
          },
        });

        const fullPath = result.filePath;
        const finalMetadata: PlaylistMetadata = {
          ...metadata,
          id: result.id || `playlist-${Date.now()}`,
          name: fileName,
        };

        onPlaylistCreated?.(fullPath, finalMetadata);

        toast({
          title: 'Playlist created successfully',
          description: `"${fileName}" has been saved to ${saveLocation}`,
        });

        // Reset form
        setTracks([]);
        setMetadata({
          id: '',
          name: '',
          description: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackCount: 0,
          totalSize: 0,
          estimatedDuration: 0,
          version: 1,
        });
        setShowSaveDialog(false);
      } else {
        // Download method
        const m3uContent = generateM3UContent();
        downloadPlaylist(fileName, m3uContent);
      }
    } catch (error) {
      toast({
        title: 'Error creating playlist',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [validatePlaylist, metadata, tracks, saveMethod, saveLocation, onPlaylistCreated, toast]);

  const generateM3UContent = useCallback(() => {
    const header = '#EXTM3U\n';
    const trackEntries = tracks.map(track => {
      const duration = track.duration ? Math.floor(track.duration) : -1;
      const artist = track.artist || 'Unknown Artist';
      const title = track.name;
      return `#EXTINF:${duration},${artist} - ${title}\n${track.path}`;
    }).join('\n');
    
    return header + trackEntries;
  }, [tracks]);

  const downloadPlaylist = useCallback((fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: 'Playlist downloaded',
      description: `"${fileName}" has been downloaded`,
    });
  }, [toast]);

  // Render track item
  const renderTrackItem = useCallback((track: PlaylistTrack, index: number) => {
    const isSelected = selectedTracks.has(track.id);
    const isDragging = draggedTrack === track.id;
    const isDropTarget = dragOverIndex === index;

    return (
      <div
        key={track.id}
        className={`
          flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-200
          ${isSelected ? 'ring-2 ring-primary bg-accent' : 'hover:bg-accent/50'}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDropTarget ? 'border-primary border-2' : ''}
        `}
        draggable
        onDragStart={(e) => handleDragStart(e, track.id)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, index)}
      >
        {/* Drag Handle */}
        <div className="flex-shrink-0 cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Track Number */}
        <div className="flex-shrink-0 text-sm text-muted-foreground w-8 text-center">
          {index + 1}
        </div>

        {/* Selection Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleTrackSelection(track.id)}
          className="flex-shrink-0"
        />

        {/* Track Icon */}
        <div className="flex-shrink-0">
          {track.isFavorite ? (
            <Heart className="h-4 w-4 text-red-500 fill-current" />
          ) : (
            <Music className="h-4 w-4 text-primary" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{track.name}</p>
            {track.format && (
              <Badge variant="outline" className="text-xs">
                {track.format.toUpperCase()}
              </Badge>
            )}
            {track.tags && track.tags.length > 0 && (
              <div className="flex gap-1">
                {track.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {track.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{track.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {track.artist && <span>{track.artist}</span>}
            {track.album && <span>• {track.album}</span>}
            <span>• {formatDuration(track.duration)}</span>
            {track.size && <span>• {formatFileSize(track.size)}</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {track.path}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTrackFavorite(track.id)}
                  className="h-8 w-8 p-0"
                >
                  <Heart className={`h-4 w-4 ${track.isFavorite ? 'text-red-500 fill-current' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {track.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedTrackForDetails(track);
                setShowTrackDetailsDialog(true);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateTrack(track.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => removeTrack(track.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }, [
    selectedTracks,
    draggedTrack,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    toggleTrackSelection,
    toggleTrackFavorite,
    duplicateTrack,
    removeTrack,
    formatDuration,
    formatFileSize,
  ]);

  const sortedAndFilteredTracks = getSortedAndFilteredTracks();

  return (
    <div className="space-y-6">
      {/* Header with metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileMusic className="h-5 w-5" />
              Enhanced Playlist Creator
            </div>
            {tracks.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {tracks.length} tracks • {formatDuration(metadata.estimatedDuration)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Basic Info Row */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={metadata.name}
                  onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter playlist name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-select">Link to Event (Optional)</Label>
                <Select
                  value={metadata.eventId || 'none'}
                  onValueChange={(value) => setMetadata(prev => ({
                    ...prev,
                    eventId: value === 'none' ? undefined : value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event (Custom playlist)</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.uid} value={event.uid}>
                        {event.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Playlist Stats</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{tracks.length} tracks</div>
                  <div>{formatDuration(metadata.estimatedDuration)} total</div>
                  <div>{formatFileSize(metadata.totalSize)}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={metadata.description || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter playlist description"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* File Browser */}
        <Card className="h-[700px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              File Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-80px)]">
            <EnhancedFileBrowser
              onFileSelect={handleFileSelect}
              onMultiSelect={handleMultiSelect}
              onPlaylistFileSelect={handlePlaylistFileSelect}
              mediaOnly={true}
              multiSelect={true}
              height="h-full"
              compact={false}
              showToolbar={true}
              showBulkActions={true}
              allowDragDrop={true}
            />
          </CardContent>
        </Card>

        {/* Playlist Builder */}
        <Card className="h-[700px] flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Current Playlist
              </div>
              <div className="flex items-center gap-2">
                {/* View Controls */}
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
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Action Buttons */}
                {tracks.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={clearPlaylist}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!metadata.name.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>

            {/* Search and Filter Controls */}
            {tracks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SortAsc className="h-4 w-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['name', 'artist', 'album', 'duration', 'addedAt', 'format'] as SortField[]).map(field => (
                      <DropdownMenuItem
                        key={field}
                        onClick={() => {
                          if (sortField === field) {
                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField(field);
                            setSortDirection('asc');
                          }
                        }}
                      >
                        {field === sortField && (
                          sortDirection === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />
                        )}
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedTracks.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        {selectedTracks.size} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={removeSelectedTracks}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={clearSelection}>
                        <X className="h-4 w-4 mr-2" />
                        Clear Selection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={selectAllTracks}>
                        <Check className="h-4 w-4 mr-2" />
                        Select All
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {tracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div className="text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tracks added yet</p>
                  <p className="text-sm">
                    Use the file browser to add tracks to your playlist
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {sortedAndFilteredTracks.map((track, index) => 
                    renderTrackItem(track, index)
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Playlist Name</Label>
              <Input
                value={metadata.name}
                onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter playlist name"
              />
            </div>

            <div>
              <Label>Save Method</Label>
              <Select
                value={saveMethod}
                onValueChange={(value: 'download' | 'server') => setSaveMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Save to Server
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download File
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {saveMethod === 'server' && (
              <div>
                <Label>Save Location</Label>
                <div className="flex gap-2">
                  <Input
                    value={saveLocation}
                    onChange={(e) => setSaveLocation(e.target.value)}
                    placeholder="Enter save path"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setSaveLocation(defaultPlaylistPath)}
                  >
                    Default
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default: {defaultPlaylistPath}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createPlaylist} disabled={isCreating}>
                {isCreating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : saveMethod === 'server' ? (
                  <Server className="h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {saveMethod === 'server' ? 'Save to Server' : 'Download'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Track Details Dialog */}
      <Dialog open={showTrackDetailsDialog} onOpenChange={setShowTrackDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track Details</DialogTitle>
          </DialogHeader>
          {selectedTrackForDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={selectedTrackForDetails.name}
                    onChange={(e) => {
                      const updatedTrack = { ...selectedTrackForDetails, name: e.target.value };
                      setSelectedTrackForDetails(updatedTrack);
                      setTracks(prev => prev.map(t => 
                        t.id === updatedTrack.id ? updatedTrack : t
                      ));
                    }}
                  />
                </div>
                <div>
                  <Label>Artist</Label>
                  <Input
                    value={selectedTrackForDetails.artist || ''}
                    onChange={(e) => {
                      const updatedTrack = { ...selectedTrackForDetails, artist: e.target.value };
                      setSelectedTrackForDetails(updatedTrack);
                      setTracks(prev => prev.map(t => 
                        t.id === updatedTrack.id ? updatedTrack : t
                      ));
                    }}
                    placeholder="Enter artist"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Album</Label>
                  <Input
                    value={selectedTrackForDetails.album || ''}
                    onChange={(e) => {
                      const updatedTrack = { ...selectedTrackForDetails, album: e.target.value };
                      setSelectedTrackForDetails(updatedTrack);
                      setTracks(prev => prev.map(t => 
                        t.id === updatedTrack.id ? updatedTrack : t
                      ));
                    }}
                    placeholder="Enter album"
                  />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={formatDuration(selectedTrackForDetails.duration)}
                    disabled
                  />
                </div>
              </div>

              <div>
                <Label>File Path</Label>
                <Input value={selectedTrackForDetails.path} disabled />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={selectedTrackForDetails.notes || ''}
                  onChange={(e) => {
                    const updatedTrack = { ...selectedTrackForDetails, notes: e.target.value };
                    setSelectedTrackForDetails(updatedTrack);
                    setTracks(prev => prev.map(t => 
                      t.id === updatedTrack.id ? updatedTrack : t
                    ));
                  }}
                  placeholder="Add notes about this track"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedTrackForDetails.isFavorite}
                  onCheckedChange={(checked) => {
                    const updatedTrack = { ...selectedTrackForDetails, isFavorite: checked as boolean };
                    setSelectedTrackForDetails(updatedTrack);
                    setTracks(prev => prev.map(t => 
                      t.id === updatedTrack.id ? updatedTrack : t
                    ));
                  }}
                />
                <Label>Mark as favorite</Label>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowTrackDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}