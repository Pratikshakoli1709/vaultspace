'use client';

import { useState, useMemo, useEffect } from 'react';
import * as React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Folder, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useFolderStore } from '@/stores/folder-store';
import { FileCard } from './FileCard';
import { Breadcrumbs } from './Breadcrumbs';
import { CreateFolderDialog } from './CreateFolderDialog';
import type { FileWithVersions, User, EnrichedDataItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FolderViewProps {
  files: EnrichedDataItem[];
  currentUser: User;
  viewMode?: 'grid' | 'list';
  onFileUpdated?: (file: FileWithVersions) => void;
  onFileDeleted?: (fileId: string) => void;
  onFolderCreated?: () => void;
  externalDndContext?: boolean; // If true, don't create own DndContext
  hideNewFolder?: boolean; // If true, hide the "New Folder" button
  teamScopedRecentFiles?: FileWithVersions[]; // Override recentFiles for team view
  teamScopedStarredItems?: (Folder | FileWithVersions)[]; // Override starredItems for team view
}

interface DroppableFolderProps {
  folderId: string | null;
  children: React.ReactNode;
}

function DroppableFolder({ folderId, children }: DroppableFolderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folderId || 'root'}`,
    data: {
      type: 'folder',
      folderId,
    },
  });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[400px] transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-950/20'
      )}
    >
      {children}
    </div>
  );
}

export function FolderView({
  files,
  currentUser,
  viewMode: initialViewMode = 'list',
  onFileUpdated,
  onFileDeleted,
  onFolderCreated,
  externalDndContext = false,
  hideNewFolder = false,
  teamScopedRecentFiles,
  teamScopedStarredItems,
}: FolderViewProps) {
  // Always use list view - no grid/card format
  const [viewMode] = useState<'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'recent'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [semanticResults, setSemanticResults] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Local state to track files for immediate UI updates
  const [localFiles, setLocalFiles] = useState<EnrichedDataItem[]>(files);
  
  // Use ref to track previous files to detect actual changes
  const prevFilesRef = React.useRef<EnrichedDataItem[]>(files);
  
  // Update local files when prop changes - only if actually different
  useEffect(() => {
    // Create signatures to compare - include folderId and isStarred to detect moves and star changes
    const prevIds = new Set(prevFilesRef.current.map((f) => f.id));
    const newIds = new Set(files.map((f) => f.id));
    
    // Check if files were added, removed, or changed
    const idsChanged = prevFilesRef.current.length !== files.length || 
      [...prevIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !prevIds.has(id));
    
    const contentChanged = prevFilesRef.current.some((prevFile) => {
      const newFile = files.find((f) => f.id === prevFile.id);
      if (!newFile) return false;
      return (
        prevFile.isStarred !== newFile.isStarred ||
        prevFile.is_starred !== newFile.is_starred ||
        prevFile.folderId !== newFile.folderId ||
        prevFile.title !== newFile.title
      );
    });
    
    // Update if files were added/removed or content changed
    if (idsChanged || contentChanged) {
      setLocalFiles(files);
      prevFilesRef.current = files;
    }
  }, [files]);
  
  // Listen for file-moved events from drag and drop
  useEffect(() => {
    const handleFileMoved = (event: CustomEvent<{ fileId: string; folderId: string | null }>) => {
      const { fileId, folderId } = event.detail;
      // Update localFiles immediately when file is moved
      setLocalFiles((prev) =>
        prev.map((f) => {
          if (f.id === fileId) {
            return {
              ...f,
              folderId: folderId,
            };
          }
          return f;
        })
      );
    };
    
    window.addEventListener('file-moved', handleFileMoved as EventListener);
    return () => {
      window.removeEventListener('file-moved', handleFileMoved as EventListener);
    };
  }, []);
  
  // Handle file updates - update local state immediately
  const handleFileUpdated = (updatedFile: FileWithVersions) => {
    // Update local files immediately - create new object to trigger re-render
    setLocalFiles((prev) =>
      prev.map((f) => {
        if (f.id === updatedFile.id) {
          // Create completely new object to ensure React detects the change
          // Ensure isStarred is explicitly set
          const updated = {
            ...f,
            ...updatedFile,
            isStarred: updatedFile.isStarred !== undefined ? updatedFile.isStarred : f.isStarred,
            is_starred: updatedFile.is_starred !== undefined ? updatedFile.is_starred : (updatedFile.isStarred !== undefined ? updatedFile.isStarred : f.is_starred),
          };
          return updated;
        }
        return f;
      })
    );
    // Also call parent callback
    onFileUpdated?.(updatedFile);
  };
  
  // Handle file deletion - remove from local state immediately
  const handleFileDeleted = (fileId: string) => {
    // Remove file from localFiles immediately
    setLocalFiles((prev) => prev.filter((f) => f.id !== fileId));
    // Also call parent callback
    onFileDeleted?.(fileId);
  };
  
  const {
    selectedFolderId,
    folders,
    recentFiles: globalRecentFiles,
    starredItems: globalStarredItems,
    setSelectedFolder,
    moveFile,
    moveFolder,
    addToRecent,
    starItem,
    unstarItem,
    getFolderById,
  } = useFolderStore();

  // Use team-scoped recent/starred if provided, otherwise use global
  const recentFiles = teamScopedRecentFiles || globalRecentFiles;
  const starredItems = teamScopedStarredItems || globalStarredItems;
  
  // Listen for starred items updates to refresh localFiles
  useEffect(() => {
    // When starredItems change, update localFiles to reflect starred status
    setLocalFiles((prev) =>
      prev.map((file) => {
        const isInStarredItems = starredItems.some((item) => item.id === file.id && 'title' in item);
        if (isInStarredItems && !file.isStarred) {
          // File is in starredItems but not marked as starred in localFiles
          return {
            ...file,
            isStarred: true,
            is_starred: true,
          };
        } else if (!isInStarredItems && file.isStarred) {
          // File is not in starredItems but marked as starred in localFiles
          return {
            ...file,
            isStarred: false,
            is_starred: false,
          };
        }
        return file;
      })
    );
  }, [starredItems]);
  
  // Filter files based on selected folder or special views
  const currentFolder = selectedFolderId && selectedFolderId !== 'starred' && selectedFolderId !== 'recent' 
    ? getFolderById(selectedFolderId) 
    : null;
  
  // Use localFiles instead of files prop for immediate updates
  const filesWithVersions = useMemo(() => {
    const starredFileIds = new Set(
      starredItems.filter((item) => 'title' in item).map((item) => item.id)
    );
    
    return localFiles.map((file) => {
      // Determine isStarred status - prioritize explicit value, then check starredItems store
      const isStarredFromStore = starredFileIds.has(file.id);
      
      // Check multiple sources for starred status - be more explicit
      let isStarred = false;
      if (file.isStarred === true) {
        isStarred = true;
      } else if (file.is_starred === true) {
        isStarred = true;
      } else if (isStarredFromStore) {
        isStarred = true;
      }
      
      return {
        ...file,
        folderId: file.folderId ?? null,
        // Ensure isStarred is always a boolean
        isStarred: isStarred,
        is_starred: isStarred,
        lastAccessed: null,
        versions: file.versions || [],
        currentVersion: file.currentVersion || 1,
      };
    });
  }, [localFiles, starredItems]);
  
  // Filter by selected folder or special views
  const filteredFiles = useMemo(() => {
    let fileList: FileWithVersions[] = [];
    
    if (selectedFolderId === 'starred') {
      // Filter files where isStarred === true
      // Check multiple sources to ensure we catch all starred files
      fileList = filesWithVersions.filter((file) => {
        // Check explicit isStarred property
        const isStarredExplicit = file.isStarred === true || file.is_starred === true;
        
        // Also check if file is in starredItems store
        const inStarredStore = starredItems.some((item) => item.id === file.id && 'title' in item);
        
        // Show if either condition is true
        return isStarredExplicit || inStarredStore;
      });
    } else if (selectedFolderId === 'recent') {
      fileList = recentFiles;
    } else if (currentFolder) {
      // Show files that belong to this folder
      fileList = filesWithVersions.filter((file) => file.folderId === currentFolder.id);
    } else {
      // Root level - only show files without folders (folderId is null or undefined)
      fileList = filesWithVersions.filter((file) => !file.folderId);
    }
    
    // Apply tab filter (if using tabs instead of folder selection)
    if (activeTab === 'starred' && selectedFolderId !== 'starred') {
      // Filter files where isStarred === true
      // Check multiple sources to ensure we catch all starred files
      fileList = fileList.filter((file) => {
        // Check explicit isStarred property
        const isStarredExplicit = file.isStarred === true || file.is_starred === true;
        
        // Also check if file is in starredItems store
        const inStarredStore = starredItems.some((item) => item.id === file.id && 'title' in item);
        
        // Show if either condition is true
        return isStarredExplicit || inStarredStore;
      });
    } else if (activeTab === 'recent' && selectedFolderId !== 'recent') {
      fileList = recentFiles;
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      if (isSemanticSearch && semanticResults.length > 0) {
        // Use semantic search results
        const resultSet = new Set(semanticResults);
        fileList = fileList.filter((file) => resultSet.has(file.id));
      } else {
        // Use traditional text search
        const query = searchQuery.toLowerCase();
        fileList = fileList.filter((file) =>
          file.title.toLowerCase().includes(query) ||
          file.category?.toLowerCase().includes(query) ||
          file.tags?.some((tag) => tag.toLowerCase().includes(query))
        );
      }
    }
    
    return fileList;
  }, [activeTab, selectedFolderId, currentFolder, filesWithVersions, recentFiles, starredItems, searchQuery, isSemanticSearch, semanticResults]);
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Handle file drop into folder (from main view or folder tree)
    if (activeData?.type === 'file' && overData?.type === 'folder') {
      // Extract file ID - handle both file object and direct ID
      const fileId = activeData.file?.id || activeData.id?.replace('file-', '');
      
      if (!fileId) {
        console.error('No file ID found in drag data:', activeData);
        toast({
          title: 'Error',
          description: 'Could not identify file to move',
          variant: 'destructive',
        });
        return;
      }
      
      // Check if file still exists in localFiles (might have been deleted)
      const fileExists = localFiles.some((f) => f.id === fileId);
      if (!fileExists) {
        // File was deleted, silently ignore the drag operation
        console.warn('File no longer exists, ignoring drag operation:', fileId);
        return;
      }
      
      // Handle both 'root' string and actual folder IDs
      // Also handle folder tree drops (ID format: folder-tree-${folderId})
      let targetFolderId: string | null = null;
      if (overData.folderId && overData.folderId !== 'root' && overData.folderId !== 'starred' && overData.folderId !== 'recent') {
        // Validate it's a UUID before using it
        const folderIdStr = overData.folderId as string;
        if (folderIdStr.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          targetFolderId = folderIdStr;
        }
      } else if (over.id && typeof over.id === 'string' && over.id.startsWith('folder-tree-')) {
        // Extract folder ID from folder tree drop target
        const extractedId = over.id.replace('folder-tree-', '');
        // Validate it's a UUID before using it
        if (extractedId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          targetFolderId = extractedId;
        }
      }
      
      // Import and call the move service
      const { moveFileToFolder } = await import('@/lib/folder-service');
      const result = await moveFileToFolder(fileId, targetFolderId, currentUser);
      
      if (result.success) {
        // Normalize folderId for local state update (same validation)
        let normalizedId: string | null = null;
        if (targetFolderId && targetFolderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          normalizedId = targetFolderId;
        }
        
        // Update local state with normalized ID
        moveFile(fileId, normalizedId);
        
        // Update the file in the parent component
        const file = filesWithVersions.find((f) => f.id === fileId);
        if (file) {
          const updatedFile: FileWithVersions = {
            ...file,
            folderId: normalizedId,
          };
          onFileUpdated?.(updatedFile);
        }
      } else {
        // Check if error is due to file not found (deleted)
        if (result.error?.includes('not found') || result.error?.includes('deleted')) {
          // File was deleted, silently ignore - don't show error to user
          console.warn('File not found during move (likely deleted):', fileId);
          return;
        }
        
        console.error('Failed to move file:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to move file to folder',
          variant: 'destructive',
        });
      }
    }
    
    // Handle folder drop
    if (activeData?.type === 'folder' && overData?.type === 'folder') {
      const folderId = activeData.folder.id;
      const targetFolderId = overData.folderId === 'root' ? null : overData.folderId;
      
      // Prevent dropping folder into itself or its children
      if (folderId !== targetFolderId) {
        // TODO: API call to move folder
        moveFolder(folderId, targetFolderId);
      }
    }
  };
  
  const handleFileClick = (file: FileWithVersions) => {
    addToRecent(file);
  };
  
  const handleStar = (fileId: string) => {
    const file = filesWithVersions.find((f) => f.id === fileId);
    if (file) {
      // Update Zustand store
      starItem(fileId, 'file');
      // Optimistically update the file
      const updatedFile: FileWithVersions = { 
        ...file, 
        isStarred: true,
        is_starred: true,
      };
      handleFileUpdated(updatedFile);
    }
  };
  
  const handleUnstar = (fileId: string) => {
    const file = filesWithVersions.find((f) => f.id === fileId);
    if (file) {
      // Update Zustand store
      unstarItem(fileId, 'file');
      // Optimistically update the file
      const updatedFile: FileWithVersions = { 
        ...file, 
        isStarred: false,
        is_starred: false,
      };
      handleFileUpdated(updatedFile);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 border-b">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Breadcrumbs className="flex-1" />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Input
              placeholder="Search files... (AI-powered)"
              value={searchQuery}
              onChange={async (e) => {
                const query = e.target.value;
                setSearchQuery(query);
                
                // Trigger semantic search if query is long enough
                if (query.trim().length >= 3) {
                  setIsSemanticSearch(true);
                  try {
                    const response = await fetch('/api/ai/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        query,
                        userId: currentUser.id,
                        userRole: currentUser.role,
                      }),
                    });
                    
                    const data = await response.json();
                    if (data.success && data.results) {
                      setSemanticResults(data.results.map((r: any) => r.id));
                    } else {
                      setIsSemanticSearch(false);
                      setSemanticResults([]);
                    }
                  } catch (error) {
                    console.error('Semantic search error:', error);
                    setIsSemanticSearch(false);
                    setSemanticResults([]);
                  }
                } else {
                  setIsSemanticSearch(false);
                  setSemanticResults([]);
                }
              }}
              className="text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
          
          {!hideNewFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="text-xs sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
          )}
          
          {/* View mode toggle removed - always showing list view */}
        </div>
      </div>
      
      {/* Tabs - only show when not in special views */}
      {selectedFolderId !== 'starred' && selectedFolderId !== 'recent' && (
        <div className="border-b px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'starred' | 'recent')}>
            <TabsList>
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All Files
              </TabsTrigger>
              <TabsTrigger value="starred" className="text-xs sm:text-sm">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                Starred
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {externalDndContext ? (
          // Use external DndContext from parent
          <DroppableFolder folderId={selectedFolderId}>
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No files here</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  {selectedFolderId === 'starred'
                    ? 'Star files to see them here'
                    : selectedFolderId === 'recent'
                    ? 'Files you open will appear here'
                    : activeTab === 'starred'
                    ? 'Star files to see them here'
                    : activeTab === 'recent'
                    ? 'Files you open will appear here'
                    : 'Upload files or create folders to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={`${file.id}-${file.isStarred ? 'starred' : 'unstarred'}`}
                    file={file}
                    currentUser={currentUser}
                    viewMode="list"
                    onFileUpdated={handleFileUpdated}
                    onFileDeleted={handleFileDeleted}
                    onStar={handleStar}
                    onUnstar={handleUnstar}
                  />
                ))}
              </div>
            )}
          </DroppableFolder>
        ) : (
          // Use own DndContext (for standalone use)
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <DroppableFolder folderId={selectedFolderId}>
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">No files here</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    {selectedFolderId === 'starred'
                      ? 'Star files to see them here'
                      : selectedFolderId === 'recent'
                      ? 'Files you open will appear here'
                      : activeTab === 'starred'
                      ? 'Star files to see them here'
                      : activeTab === 'recent'
                      ? 'Files you open will appear here'
                      : 'Upload files or create folders to get started'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={`${file.id}-${file.isStarred ? 'starred' : 'unstarred'}`}
                      file={file}
                      currentUser={currentUser}
                      viewMode="list"
                      onFileUpdated={handleFileUpdated}
                      onFileDeleted={onFileDeleted}
                      onStar={handleStar}
                      onUnstar={handleUnstar}
                    />
                  ))}
                </div>
              )}
            </DroppableFolder>
            
            <DragOverlay>
              {activeId && (
                <div className="opacity-50">
                  {/* Drag preview - can be customized */}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      
      {isCreateDialogOpen && (
        <CreateFolderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          parentId={selectedFolderId}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

