'use client';

import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFolderStore } from '@/stores/folder-store';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { breadcrumbs, selectedFolderId, setSelectedFolder } = useFolderStore();
  
  const handleBreadcrumbClick = (folderId: string | null) => {
    setSelectedFolder(folderId);
  };
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 sm:space-x-2 text-sm overflow-x-auto', className)}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-7 sm:h-8 px-2 text-xs sm:text-sm"
        onClick={() => handleBreadcrumbClick(null)}
      >
        <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
        <span className="hidden sm:inline">Home</span>
      </Button>
      
      {breadcrumbs.map((folder, index) => (
        <div key={folder.id} className="flex items-center space-x-1 sm:space-x-2">
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 sm:h-8 px-2 text-xs sm:text-sm whitespace-nowrap',
              index === breadcrumbs.length - 1 && 'font-semibold'
            )}
            onClick={() => handleBreadcrumbClick(folder.id)}
          >
            {folder.name}
          </Button>
        </div>
      ))}
    </nav>
  );
}

