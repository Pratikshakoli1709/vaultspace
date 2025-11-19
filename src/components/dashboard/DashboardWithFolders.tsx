'use client';

import React, { useEffect, useState } from 'react';
import type { User, EnrichedDataItem, EnrichedActivityLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderView } from './FolderView';
import { FolderTree } from './FolderTree';
import { Activity, Archive, Users } from 'lucide-react';
import { useFolderStore } from '@/stores/folder-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Star, Clock, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FolderWithChildren } from '@/lib/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';

interface DashboardWithFoldersProps {
  currentUser: User;
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
  onAssetDeleted?: (assetId: string) => void;
  onAssetUpdated?: (asset: EnrichedDataItem) => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard = ({ title, value, icon: Icon }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
};

export function DashboardWithFolders({
  currentUser,
  assets,
  activityLogs,
  onAssetDeleted,
  onAssetUpdated,
}: DashboardWithFoldersProps) {
  const {
    selectedFolderId,
    setSelectedFolder,
    folders,
    starredItems,
    recentFiles,
    updateRecentFiles,
    updateStarredItems,
    setFolders,
  } = useFolderStore();
  
  // Load folders from API on mount and on refresh event
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const response = await fetch(`/api/folders?userId=${currentUser.id}`);
        const data = await response.json();

        if (data.success && data.folders) {
          // Folders are already in tree structure from API
          setFolders(data.folders as FolderWithChildren[]);
        } else {
          console.error('Failed to load folders:', data.error);
        }
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    };

    if (currentUser?.id) {
      loadFolders();
    }

    // Listen for folder refresh events
    const handleRefresh = (event: any) => {
      if (event.detail) {
        setFolders(event.detail as FolderWithChildren[]);
      } else {
        loadFolders();
      }
    };

    window.addEventListener('folders-refreshed', handleRefresh);
    return () => window.removeEventListener('folders-refreshed', handleRefresh);
  }, [currentUser.id, setFolders]);

  // Load starred items from assets (files are already loaded from API with starred status)
  // This updates whenever assets change (including when files are starred/unstarred)
  useEffect(() => {
    // Get starred files from assets (already fetched from API with isStarred/is_starred)
    const starredFiles = assets
      .filter((asset) => asset.is_starred === true || asset.isStarred === true)
      .map((asset) => ({
        ...asset,
        isStarred: true,
        is_starred: true,
        folderId: asset.folderId || null,
      }));

    // Get starred folders from store
    const getAllFoldersRecursive = (folderList: FolderWithChildren[]): FolderWithChildren[] => {
      let allFolders: FolderWithChildren[] = [];
      folderList.forEach((folder) => {
        allFolders.push(folder);
        if (folder.children) {
          allFolders = allFolders.concat(getAllFoldersRecursive(folder.children));
        }
      });
      return allFolders;
    };

    const allFolders = getAllFoldersRecursive(folders);
    const starredFolders = allFolders.filter((folder) => folder.isStarred === true);

    // Combine starred files and folders
    const allStarredItems = [...starredFiles, ...starredFolders];
    
    // Get current starred items from store (not from props to avoid loop)
    const currentStarredItems = useFolderStore.getState().starredItems;
    const currentStarredIds = new Set(currentStarredItems.map((item) => item.id));
    const newStarredIds = new Set(allStarredItems.map((item) => item.id));
    
    // Check if sets are different
    if (currentStarredIds.size !== newStarredIds.size || 
        ![...currentStarredIds].every((id) => newStarredIds.has(id))) {
      updateStarredItems(allStarredItems as any);
    }
  }, [assets, folders, updateStarredItems]); // Removed starredItems from deps to prevent loop
  
  useEffect(() => {
    // TODO: Load recent files from API based on lastAccessed
    const recent = assets
      .filter((asset) => asset.updated_at) // Simplified - check lastAccessed in real implementation
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 20)
      .map((asset) => ({
        ...asset,
        lastAccessed: asset.updated_at,
        isStarred: false,
        folderId: null,
      }));
    updateRecentFiles(recent as any);
  }, [assets, updateRecentFiles]);
  
  const handleFileUpdated = (updatedFile: any) => {
    // Convert FileWithVersions to EnrichedDataItem for parent
    const enrichedAsset: EnrichedDataItem = {
      ...updatedFile,
      // Remove FileWithVersions specific fields if needed
    };
    onAssetUpdated?.(enrichedAsset);
  };
  
  const handleFileDeleted = (fileId: string) => {
    onAssetDeleted?.(fileId);
  };
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const { moveFile } = useFolderStore();
  
  // Configure sensors with activation distance to prevent drag on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );
  
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
      
      // Check if file still exists in assets (might have been deleted)
      const fileExists = assets.some((f) => f.id === fileId);
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
      } else if (over.id && typeof over.id === 'string' && over.id.startsWith('folder-')) {
        // Handle drops on the main view's droppable area
        const extractedId = over.id.replace('folder-', '');
        if (extractedId === 'root' || extractedId === 'starred' || extractedId === 'recent') {
          targetFolderId = null; // Root level
        } else if (extractedId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
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
        const file = assets.find((f) => f.id === fileId);
        if (file) {
          const updatedFile: EnrichedDataItem = {
            ...file,
            folderId: normalizedId,
          };
          onAssetUpdated?.(updatedFile);
          
          // Also update assets array immediately for instant UI update
          // This ensures FolderView sees the updated file immediately
          const updatedAssets = assets.map((f) => 
            f.id === fileId ? updatedFile : f
          );
          // Trigger a re-render by updating a state that FolderView depends on
          // The assets prop will be updated by the parent, but we can also
          // trigger a refresh by dispatching a custom event
          window.dispatchEvent(new CustomEvent('file-moved', { 
            detail: { fileId, folderId: normalizedId } 
          }));
        }
        
        toast({
          title: 'Success',
          description: `File moved to ${targetFolderId ? 'folder' : 'root'}`,
        });
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
        const { moveFolder } = useFolderStore.getState();
        moveFolder(folderId, targetFolderId);
      }
    }
  };
  
  return (
    <div className="dashboard-center space-y-4 sm:space-y-6 w-full">
      {/* Stats Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 sm:mb-6">
          Welcome, {currentUser.name.split(' ')[0]}
        </h1>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Your Assets" value={assets.length} icon={Archive} />
          <StatCard title="Folders" value={folders.length} icon={Users} />
          <StatCard title="Recent Activity" value={activityLogs.length} icon={Activity} />
        </div>
      </div>
      
      {/* Folder System */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Files & Folders</CardTitle>
          <CardDescription className="text-sm">
            Manage your files and folders in a Drive-like interface
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
          <div className="flex h-[calc(100vh-400px)] min-h-[600px] sm:min-h-[700px]">
            {/* Left Sidebar - Folder Tree */}
            <div className="hidden lg:flex w-64 xl:w-72 border-r flex-col">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  <Button
                    variant={selectedFolderId === null ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => setSelectedFolder(null)}
                  >
                    <Home className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Home
                  </Button>
                  
                  <Button
                    variant={selectedFolderId === 'starred' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => setSelectedFolder('starred')}
                  >
                    <Star className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Starred
                    {starredItems.length > 0 && (
                      <span className="ml-auto text-xs">({starredItems.length})</span>
                    )}
                  </Button>
                  
                  <Button
                    variant={selectedFolderId === 'recent' ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => setSelectedFolder('recent')}
                  >
                    <Clock className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Recent
                    {recentFiles.length > 0 && (
                      <span className="ml-auto text-xs">({recentFiles.length})</span>
                    )}
                  </Button>
                  
                  <Separator />
                  
                  <FolderTree currentUser={currentUser} />
                </div>
              </ScrollArea>
            </div>
            
            {/* Main Content - Folder View */}
            <div className="flex-1 flex flex-col min-w-0">
              <FolderView
                files={assets}
                currentUser={currentUser}
                onFileUpdated={handleFileUpdated}
                onFileDeleted={handleFileDeleted}
                  externalDndContext={true}
              />
            </div>
          </div>
            
            <DragOverlay>
              {activeId && (
                <div className="opacity-50">
                  {/* Drag preview - can be customized */}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}

