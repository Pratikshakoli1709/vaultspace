'use client';

import { useState } from 'react';
import { useFolderStore } from '@/stores/folder-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Folder, User } from '@/lib/types';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder;
  currentUser: User;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folder,
  currentUser,
}: DeleteFolderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteFolder, getFolderById } = useFolderStore();
  const { toast } = useToast();
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Check if folder has children or files
      const folderWithChildren = getFolderById(folder.id);
      const hasChildren = folderWithChildren?.children && folderWithChildren.children.length > 0;
      const hasFiles = folderWithChildren?.files && folderWithChildren.files.length > 0;
      
      if (hasChildren || hasFiles) {
        toast({
          title: 'Cannot delete',
          description: 'Folder must be empty before deletion',
          variant: 'destructive',
        });
        setIsDeleting(false);
        return;
      }
      
      // TODO: API call to delete folder
      deleteFolder(folder.id);
      
      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete folder',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{folder.name}&quot;? This action cannot be undone.
            The folder must be empty before deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

