'use client';

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
import type { FileWithVersions, Folder } from '@/lib/types';

interface CopyConfirmDialogProps {
  item: FileWithVersions | Folder;
  type: 'file' | 'folder';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount?: number; // For folders, number of items inside
}

export function CopyConfirmDialog({
  item,
  type,
  open,
  onOpenChange,
  onConfirm,
  itemCount = 0,
}: CopyConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const itemName = type === 'file' 
    ? (item as FileWithVersions).title 
    : (item as Folder).name;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Copy {type === 'file' ? 'File' : 'Folder'}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {type === 'folder' && itemCount > 10 ? (
              <>
                This folder contains {itemCount} items. Copying may take a moment.
                <br />
                <br />
              </>
            ) : null}
            Are you sure you want to copy &quot;{itemName}&quot;?
            <br />
            A duplicate will be created with &quot;(Copy)&quot; added to the name.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto text-sm sm:text-base">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Copy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

