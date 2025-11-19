'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { getFileContentForDiff } from '@/lib/version-service';
import type { FileVersion, FileWithVersions } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  file: FileWithVersions;
  oldVersion: FileVersion;
  newVersion: FileVersion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiffViewer({
  file,
  oldVersion,
  newVersion,
  open,
  onOpenChange,
}: DiffViewerProps) {
  const [oldContent, setOldContent] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, oldVersion, newVersion]);

  const loadContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [oldResult, newResult] = await Promise.all([
        getFileContentForDiff(file.id, oldVersion.versionNumber),
        getFileContentForDiff(file.id, newVersion.versionNumber),
      ]);

      if (oldResult.success && newResult.success) {
        setOldContent(oldResult.content || '');
        setNewContent(newResult.content || '');
      } else {
        setError('Failed to load file content for comparison');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if file is text-based
  const isTextFile = file.type === 'key' || 
    (file.type === 'document' && (
      file.title.endsWith('.txt') ||
      file.title.endsWith('.md') ||
      file.title.endsWith('.json') ||
      file.title.endsWith('.js') ||
      file.title.endsWith('.ts') ||
      file.title.endsWith('.py') ||
      file.title.endsWith('.jsx') ||
      file.title.endsWith('.tsx')
    ));

  if (!isTextFile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Diff Viewer</DialogTitle>
            <DialogDescription>
              Diff viewer is only available for text-based files.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            This file type does not support diff viewing.
          </div>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Diff: Version {oldVersion.versionNumber} → Version {newVersion.versionNumber}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Comparing versions of &quot;{file.title}&quot;
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading content...</span>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-destructive">
            {error}
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-md">
            <div className="grid grid-cols-2 divide-x">
              {/* Old Version */}
              <div className="flex flex-col">
                <div className="bg-muted px-4 py-2 border-b font-semibold text-sm">
                  Version {oldVersion.versionNumber}
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                    {oldContent || '(No content)'}
                  </pre>
                </ScrollArea>
              </div>
              
              {/* New Version */}
              <div className="flex flex-col">
                <div className="bg-muted px-4 py-2 border-b font-semibold text-sm">
                  Version {newVersion.versionNumber}
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                    {newContent || '(No content)'}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

