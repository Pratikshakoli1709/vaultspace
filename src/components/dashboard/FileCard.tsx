'use client';

import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import * as React from 'react';
import { Star, MoreVertical, FileText, Link, KeyRound, Image, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AssetTypeIcon } from '@/components/icons';
import type { FileWithVersions, User, EnrichedDataItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { FileActions } from './FileActions';
import { AssetPreviewDialog } from './AssetPreviewDialog';
import { EditAssetDialog } from './EditAssetDialog';
import { DeleteFileDialog } from './DeleteFileDialog';
import { useToast } from '@/hooks/use-toast';
import { deleteAssetClient } from '@/lib/asset-service';
import { useFolderStore } from '@/stores/folder-store';

interface FileCardProps {
  file: FileWithVersions;
  currentUser: User;
  viewMode: 'grid' | 'list';
  onFileUpdated?: (file: FileWithVersions) => void;
  onFileDeleted?: (fileId: string) => void;
  onStar?: (fileId: string) => void;
  onUnstar?: (fileId: string) => void;
}

export function FileCard({
  file: fileProp,
  currentUser,
  viewMode,
  onFileUpdated,
  onFileDeleted,
  onStar,
  onUnstar,
}: FileCardProps) {
  // Use local state to track file for immediate UI updates
  const [file, setFile] = useState<FileWithVersions>(fileProp);
  const prevFileRef = React.useRef<{ id: string; isStarred: boolean | undefined }>({
    id: fileProp.id,
    isStarred: fileProp.isStarred,
  });
  
  // Update local file when prop changes - only when isStarred actually changes
  React.useEffect(() => {
    // Check if starred status changed
    const propIsStarred = fileProp.isStarred === true || fileProp.is_starred === true;
    const currentIsStarred = prevFileRef.current.isStarred === true;
    
    // Only update if id changed or isStarred changed to prevent infinite loops
    if (fileProp.id !== prevFileRef.current.id || 
        propIsStarred !== currentIsStarred) {
      const updatedFile = {
        ...fileProp,
        isStarred: propIsStarred,
        is_starred: propIsStarred,
      };
      setFile(updatedFile);
      prevFileRef.current = {
        id: fileProp.id,
        isStarred: propIsStarred,
      };
    }
  }, [fileProp.id, fileProp.isStarred, fileProp.is_starred]); // Include all starred-related props
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { starItem, unstarItem, updateStarredItems } = useFolderStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `file-${file.id}`,
    data: {
      type: 'file',
      file,
    },
    // Only activate drag after 5px movement to prevent interference with clicks
    activationConstraint: {
      distance: 5,
    },
  });
  
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  
  const handleStar = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    try {
      // Use the same logic as handleStarAction
      await handleStarAction();
    } catch (error) {
      console.error('Error in handleStar:', error);
    }
  };
  
  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };
  
  const handleOpen = () => {
    setIsPreviewOpen(true);
  };
  
  const handleStarAction = async () => {
    const isCurrentlyStarred = file.isStarred ?? false;
    const newStarredStatus = !isCurrentlyStarred;
    
    try {
      // Optimistic update - update UI immediately
      const optimisticFile: FileWithVersions = {
        ...file,
        isStarred: newStarredStatus,
        is_starred: newStarredStatus,
      };
      
      // Update local file state immediately - this will update the star icon
      setFile(optimisticFile);
      
      // Update local state immediately
      if (newStarredStatus) {
        starItem(file.id, 'file');
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = [...starredItems];
        if (!updatedStarred.find((item) => item.id === file.id)) {
          updatedStarred.push(optimisticFile);
          updateStarredItems(updatedStarred);
        }
      } else {
        unstarItem(file.id, 'file');
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = starredItems.filter((item) => item.id !== file.id);
        updateStarredItems(updatedStarred);
      }
      
      // Update parent component immediately
      onFileUpdated?.(optimisticFile);
      
      // Update backend via API
      const response = await fetch(`/api/file/${file.id}/star?userId=${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update star status`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update star status');
      }
      
      // Confirm the optimistic update was correct
      // The API returns the confirmed status
      const confirmedFile: FileWithVersions = {
        ...optimisticFile,
        isStarred: data.isStarred ?? newStarredStatus,
        is_starred: data.isStarred ?? newStarredStatus,
      };
      
      // Update local file state with confirmed value
      setFile(confirmedFile);
      onFileUpdated?.(confirmedFile);
      
      // Update store with confirmed state
      if (data.isStarred) {
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = [...starredItems];
        if (!updatedStarred.find((item) => item.id === file.id)) {
          updatedStarred.push(confirmedFile);
          updateStarredItems(updatedStarred);
        }
      } else {
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = starredItems.filter((item) => item.id !== file.id);
        updateStarredItems(updatedStarred);
      }
      
      toast({
        title: 'Success',
        description: data.isStarred 
          ? `"${file.title}" starred` 
          : `"${file.title}" unstarred`,
      });
    } catch (error: any) {
      // Revert on error
      if (isCurrentlyStarred) {
        starItem(file.id, 'file');
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = [...starredItems];
        if (!updatedStarred.find((item) => item.id === file.id)) {
          updatedStarred.push(file);
          updateStarredItems(updatedStarred);
        }
      } else {
        unstarItem(file.id, 'file');
        const { starredItems } = useFolderStore.getState();
        const updatedStarred = starredItems.filter((item) => item.id !== file.id);
        updateStarredItems(updatedStarred);
      }
      
      const revertedFile: FileWithVersions = {
        ...file,
        isStarred: isCurrentlyStarred,
        is_starred: isCurrentlyStarred,
      };
      
      // Revert local file state
      setFile(revertedFile);
      onFileUpdated?.(revertedFile);
      
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update star status',
        variant: 'destructive',
      });
    }
  };
  
  const handleFileUpdated = async (updatedFile: EnrichedDataItem) => {
    // Convert EnrichedDataItem to FileWithVersions
    const fileWithVersions: FileWithVersions = {
      ...updatedFile,
      folderId: file.folderId,
      isStarred: file.isStarred,
      lastAccessed: file.lastAccessed,
      versions: file.versions,
      currentVersion: file.currentVersion,
    };
    onFileUpdated?.(fileWithVersions);
    setIsEditDialogOpen(false);
    
    // Notification is handled in updateAssetClient service
  };
  
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleFileDeleted = async () => {
    try {
      const result = await deleteAssetClient({
        assetId: file.id,
        currentUser,
      });

      if (result.success) {
        // Close dialog first
        setIsDeleteDialogOpen(false);
        
        // Log the activity (non-blocking - don't fail delete if logging fails)
        const { logActivityClient } = await import('@/lib/asset-service');
        void logActivityClient({
          userId: currentUser.id,
          action: 'DELETED',
          itemId: file.id,
          itemTitle: file.title
        }).catch((err) => {
          console.warn('Activity logging failed (non-critical):', err);
        });
        
        toast({
          title: 'Deleted',
          description: `"${file.title}" has been deleted`,
        });
        
        // Call parent handler to remove from UI immediately
        onFileDeleted?.(file.id);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };
  
  const canEdit = currentUser.role === 'admin' || file.created_by === currentUser.id;
  
  if (viewMode === 'list') {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            'flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-md border hover:bg-accent transition-colors cursor-pointer',
            isDragging && 'opacity-50'
          )}
          onClick={() => setIsPreviewOpen(true)}
        >
          <div className="flex-shrink-0">
            <AssetTypeIcon
              type={file.type}
              className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-medium truncate">{file.title}</h4>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {file.type}
              </Badge>
              {file.category && (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  {file.category}
                </Badge>
              )}
              {file.lastAccessed && (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Opened {formatDistanceToNow(new Date(file.lastAccessed), { addSuffix: true })}</span>
                </>
              )}
            </div>
            {file.tags && file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {file.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {tag}
                  </Badge>
                ))}
                {file.tags.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    +{file.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div 
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()} // Prevent drag when clicking buttons
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={handleStar}
            >
              <Star
                className={cn(
                  'h-3 w-3 sm:h-4 sm:w-4 transition-colors',
                  (file.isStarred === true || file.is_starred === true)
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'fill-none text-muted-foreground'
                )}
              />
            </Button>
            
            <FileActions
              file={file}
              currentUser={currentUser}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onOpen={handleOpen}
            />
          </div>
        </div>
        
        {isPreviewOpen && (
          <AssetPreviewDialog
            asset={file}
            onOpenChange={setIsPreviewOpen}
          />
        )}
        
        {isEditDialogOpen && (
          <EditAssetDialog
            asset={file as EnrichedDataItem}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            currentUser={currentUser}
            onAssetUpdated={handleFileUpdated}
          />
        )}

        {isDeleteDialogOpen && (
          <DeleteFileDialog
            file={file}
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleFileDeleted}
          />
        )}
      </>
    );
  }
  
  // Grid view removed - only list view is supported
  // This should never be reached since viewMode is always 'list'
  return null;
}

