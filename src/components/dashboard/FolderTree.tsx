'use client';

import { useState } from 'react';
import { Folder, FolderOpen, Star, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFolderStore } from '@/stores/folder-store';
import { useDroppable } from '@dnd-kit/core';
import type { FolderWithChildren, User } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateFolderDialog } from './CreateFolderDialog';
import { RenameFolderDialog } from './RenameFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';

interface FolderTreeProps {
  currentUser: User;
  onCreateFolder?: (parentId: string | null) => void;
}

interface DroppableFolderProps {
  folderId: string;
  children: React.ReactNode;
}

function DroppableFolder({ folderId, children }: DroppableFolderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-tree-${folderId}`,
    data: {
      type: 'folder',
      folderId,
    },
  });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-0',
        isOver && 'bg-blue-50 dark:bg-blue-950/20 rounded'
      )}
    >
      {children}
    </div>
  );
}

interface FolderTreeNodeProps {
  folder: FolderWithChildren;
  level: number;
  currentUser: User;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder?: (parentId: string | null) => void;
}

function FolderTreeNode({
  folder,
  level,
  currentUser,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelectFolder,
  onCreateFolder,
}: FolderTreeNodeProps) {
  const { starItem, unstarItem, canUserAccessFolder } = useFolderStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;
  const canAccess = canUserAccessFolder(folder, currentUser);
  const canEdit = currentUser.role === 'admin' || folder.ownerId === currentUser.id;
  
  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { starFolder, unstarFolder } = await import('@/lib/star-service');
      if (folder.isStarred) {
        const result = await unstarFolder(folder.id, currentUser);
        if (result.success) {
          unstarItem(folder.id, 'folder');
        }
      } else {
        const result = await starFolder(folder.id, currentUser);
        if (result.success) {
          starItem(folder.id, 'folder');
        }
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };
  
  if (!canAccess) return null;
  
  return (
    <>
      <div
        className={cn(
          'flex items-center group px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent',
          isSelected && 'bg-accent font-medium',
          level > 0 && 'ml-4 sm:ml-6'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 mr-1"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              onToggleExpand(folder.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            )
          ) : (
            <div className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
        </Button>
        
        <DroppableFolder folderId={folder.id}>
          <div
            className="flex items-center flex-1 min-w-0"
            onClick={() => onSelectFolder(folder.id)}
          >
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 text-blue-500" />
            )}
            <span className="text-xs sm:text-sm truncate flex-1">{folder.name}</span>
          </div>
        </DroppableFolder>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={handleStar}
          >
            <Star
              className={cn(
                'h-3 w-3 sm:h-4 sm:w-4',
                folder.isStarred && 'fill-yellow-400 text-yellow-400'
              )}
            />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                <span className="text-xs">⋯</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 sm:w-48">
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                    New Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              level={level + 1}
              currentUser={currentUser}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
      
      {isCreateDialogOpen && (
        <CreateFolderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          parentId={folder.id}
          currentUser={currentUser}
        />
      )}
      
      {isRenameDialogOpen && (
        <RenameFolderDialog
          open={isRenameDialogOpen}
          onOpenChange={setIsRenameDialogOpen}
          folder={folder}
          currentUser={currentUser}
        />
      )}
      
      {isDeleteDialogOpen && (
        <DeleteFolderDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          folder={folder}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

export function FolderTree({ currentUser, onCreateFolder }: FolderTreeProps) {
  const { folders, selectedFolderId, setSelectedFolder, starItem, unstarItem } = useFolderStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  
  const handleSelectFolder = (folderId: string) => {
    setSelectedFolder(folderId);
    // Auto-expand when selecting
    if (!expandedFolders.has(folderId)) {
      setExpandedFolders((prev) => new Set([...prev, folderId]));
    }
  };
  
  const rootFolders = folders.filter((f) => !f.parentId);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b">
        <h3 className="text-sm sm:text-base font-semibold">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {rootFolders.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs sm:text-sm text-muted-foreground">
            No folders yet. Create one to get started.
          </div>
        ) : (
          rootFolders.map((folder) => (
            <FolderTreeNode
              key={folder.id}
              folder={folder}
              level={0}
              currentUser={currentUser}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleExpand}
              onSelectFolder={handleSelectFolder}
              onCreateFolder={onCreateFolder}
            />
          ))
        )}
      </div>
      
      {isCreateDialogOpen && (
        <CreateFolderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          parentId={null}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

