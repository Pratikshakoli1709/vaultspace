'use client';

import { useState, useEffect } from 'react';
import { useFolderStore } from '@/stores/folder-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Folder, User } from '@/lib/types';

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder;
  currentUser: User;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  folder,
  currentUser,
}: RenameFolderDialogProps) {
  const [folderName, setFolderName] = useState(folder.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const { updateFolder } = useFolderStore();
  const { toast } = useToast();
  
  useEffect(() => {
    if (open) {
      setFolderName(folder.name);
    }
  }, [open, folder.name]);
  
  const handleRename = async () => {
    if (!folderName.trim()) {
      toast({
        title: 'Error',
        description: 'Folder name is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (folderName.trim() === folder.name) {
      onOpenChange(false);
      return;
    }
    
    setIsRenaming(true);
    try {
      // TODO: API call to rename folder
      updateFolder(folder.id, {
        name: folderName.trim(),
        updatedAt: new Date().toISOString(),
      });
      
      toast({
        title: 'Success',
        description: 'Folder renamed successfully',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to rename folder',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for this folder.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="My Folder"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
              className="text-sm sm:text-base"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={isRenaming || !folderName.trim()}>
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

