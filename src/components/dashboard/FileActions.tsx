'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { FileWithVersions, User } from '@/lib/types';

interface FileActionsProps {
  file: FileWithVersions;
  currentUser: User;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
}

export function FileActions({
  file,
  currentUser,
  onEdit,
  onDelete,
  onOpen,
}: FileActionsProps) {
  const [open, setOpen] = useState(false);
  
  const handleAction = async (action: (() => void | Promise<void>) | undefined, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (action) {
      try {
        const result = action();
        // If it's a promise, handle it
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error('Action error:', error);
      } finally {
        setOpen(false); // Close dropdown after action
      }
    } else {
      setOpen(false);
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 sm:w-48" onClick={(e) => e.stopPropagation()}>
        {/* Open - always available */}
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleAction(onOpen, e);
          }}
        >
          <Eye className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Open
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Edit - always visible */}
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleAction(onEdit, e);
          }}
        >
          <Edit className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Edit
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Delete - always visible */}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleAction(onDelete, e);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

