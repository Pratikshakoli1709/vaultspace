'use client';

import { useState } from 'react';
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
import type { User } from '@/lib/types';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  currentUser: User;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId,
  currentUser,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createFolder } = useFolderStore();
  const { toast } = useToast();
  
  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast({
        title: 'Error',
        description: 'Folder name is required',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreating(true);
    try {
      // Create folder via API
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId,
          userId: currentUser.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create folder');
      }

      // Add folder to local store
      if (data.folder) {
        createFolder(data.folder);
      }
      
      // Reload folders from API to get updated tree structure
      try {
        const reloadResponse = await fetch(`/api/folders?userId=${currentUser.id}`);
        const reloadData = await reloadResponse.json();
        if (reloadData.success && reloadData.folders) {
          // This will trigger a refresh in DashboardWithFolders
          window.dispatchEvent(new CustomEvent('folders-refreshed', { detail: reloadData.folders }));
        }
      } catch (reloadError) {
        console.warn('Failed to reload folders:', reloadError);
      }
      
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
      
      setFolderName('');
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create folder';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for the new folder.
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
                  handleCreate();
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
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !folderName.trim()}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

