'use client';

import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import type { FileWithVersions, Folder } from '@/lib/types';

interface RenameDialogProps {
  item: FileWithVersions | Folder;
  type: 'file' | 'folder';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed: (newName: string) => void;
}

export function RenameDialog({
  item,
  type,
  open,
  onOpenChange,
  onRenamed,
}: RenameDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(type === 'file' ? (item as FileWithVersions).title : (item as Folder).name);
    }
  }, [open, item, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (name === (type === 'file' ? (item as FileWithVersions).title : (item as Folder).name)) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the rename handler
      onRenamed(name.trim());
      
      toast({
        title: 'Success',
        description: `${type === 'file' ? 'File' : 'Folder'} renamed successfully`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to rename ${type}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename {type === 'file' ? 'File' : 'Folder'}</DialogTitle>
          <DialogDescription className="text-sm">
            Enter a new name for this {type}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm sm:text-base">
                {type === 'file' ? 'File' : 'Folder'} Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${type} name`}
                disabled={isSubmitting}
                className="text-sm sm:text-base h-9 sm:h-10"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

