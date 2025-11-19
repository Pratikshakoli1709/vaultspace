'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Download, RotateCcw, FileText, Check, Eye, GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { restoreVersion, getFileVersions } from '@/lib/version-service';
import { AssetPreviewDialog } from './AssetPreviewDialog';
import { DiffViewer } from './DiffViewer';
import type { FileWithVersions, FileVersion, User } from '@/lib/types';

interface VersionHistoryModalProps {
  file: FileWithVersions;
  currentUser: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionRestored?: (file: FileWithVersions) => void;
}

export function VersionHistoryModal({
  file,
  currentUser,
  open,
  onOpenChange,
  onVersionRestored,
}: VersionHistoryModalProps) {
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [versions, setVersions] = useState<FileVersion[]>(file.versions || []);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<FileVersion | null>(null);
  const [diffVersions, setDiffVersions] = useState<{ old: FileVersion; new: FileVersion } | null>(null);
  const { toast } = useToast();
  
  const currentVersion = file.currentVersion || versions.length || 1;

  // Load versions when modal opens
  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, file.id]);

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const loadedVersions = await getFileVersions(file.id);
      setVersions(loadedVersions);
      
      // If no versions exist but file has current_version, create initial version
      if (loadedVersions.length === 0 && file.currentVersion) {
        // This is handled by the backend - versions are created on first upload
        console.log('No versions found, file may not have version history yet');
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVersions(false);
    }
  };
  
  const handleRestore = async (version: FileVersion) => {
    setRestoringVersion(version.id);
    try {
      const result = await restoreVersion({
        fileId: file.id,
        versionNumber: version.versionNumber,
        currentUser,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: `Version ${version.versionNumber} has been restored`,
        });
        
        // Reload versions to get the new restored version
        await loadVersions();
        
        // Fetch updated file data to get the new current version
        try {
          const { getFileVersions: reloadVersions } = await import('@/lib/version-service');
          const updatedVersions = await reloadVersions(file.id);
          const latestVersion = updatedVersions.length > 0 
            ? Math.max(...updatedVersions.map(v => v.versionNumber))
            : (file.currentVersion || 1) + 1;
        
        // Update file with new current version
        const updatedFile: FileWithVersions = {
          ...file,
            currentVersion: latestVersion,
            versions: updatedVersions,
        };
        
        onVersionRestored?.(updatedFile);
        } catch (error) {
          console.error('Failed to reload versions after restore:', error);
          // Still notify parent of success
          const updatedFile: FileWithVersions = {
            ...file,
            currentVersion: (file.currentVersion || 1) + 1,
          };
          onVersionRestored?.(updatedFile);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to restore version',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore version',
        variant: 'destructive',
      });
    } finally {
      setRestoringVersion(null);
    }
  };
  
  const handleDownload = (version: FileVersion) => {
    if (version.fileUrl) {
      window.open(version.fileUrl, '_blank');
    } else {
      toast({
        title: 'Error',
        description: 'File URL not available',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = (version: FileVersion) => {
    setPreviewVersion(version);
  };

  const handleViewDiff = (version: FileVersion) => {
    // Find the previous version for comparison
    const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    const currentIndex = sortedVersions.findIndex((v) => v.versionNumber === version.versionNumber);
    const previousVersion = sortedVersions[currentIndex + 1];
    
    if (previousVersion) {
      setDiffVersions({ old: previousVersion, new: version });
    } else {
      toast({
        title: 'Info',
        description: 'No previous version to compare with',
      });
    }
  };
  
  const canRestore = currentUser.role === 'admin' || file.created_by === currentUser.id;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Version History</DialogTitle>
          <DialogDescription className="text-sm">
            View and restore previous versions of &quot;{file.title}&quot;
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 sm:space-y-4">
            {isLoadingVersions ? (
              <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm sm:text-base text-muted-foreground mb-2">
                No version history available
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload a new version to start tracking changes
                </p>
              </div>
            ) : (
              versions
                .sort((a, b) => b.versionNumber - a.versionNumber)
                .map((version) => {
                  const isCurrent = version.versionNumber === currentVersion;
                  const isRestoring = restoringVersion === version.id;
                  
                  return (
                    <div
                      key={version.id}
                      className={cn(
                        'flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-colors',
                        isCurrent && 'bg-accent',
                        'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2">
                          <span className="text-sm sm:text-base font-semibold">
                            Version {version.versionNumber}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                          {version.size && (
                            <Badge variant="secondary" className="text-xs">
                              {(version.size / 1024).toFixed(1)} KB
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                            </span>
                            <span className="hidden sm:inline">
                              ({format(new Date(version.timestamp), 'MMM d, yyyy h:mm a')})
                            </span>
                          </div>
                          
                          {version.uploadedByName && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>Uploaded by {version.uploadedByName}</span>
                            </div>
                          )}
                          
                          {version.changelog && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <strong>Changelog:</strong> {version.changelog}
                            </div>
                          )}
                        </div>
                        
                        {version.diff && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono max-h-24 overflow-auto">
                            {version.diff.startsWith('KEY_CONTENT:') 
                              ? version.diff.replace('KEY_CONTENT:', '')
                              : version.diff}
                          </div>
                        )}
                        
                        {/* Show key value for key files if available */}
                        {file.type === 'key' && version.diff && version.diff.startsWith('KEY_CONTENT:') && (
                          <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                            <strong>Key Value:</strong> {version.diff.replace('KEY_CONTENT:', '')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0">
                        {version.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs sm:text-sm h-7 sm:h-8"
                            onClick={() => handlePreview(version)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                            <span className="hidden sm:inline">Preview</span>
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm h-7 sm:h-8"
                          onClick={() => handleDownload(version)}
                          disabled={!version.fileUrl}
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                        
                        {/* View Diff - only for text files */}
                        {file.type === 'key' || (file.type === 'document' && versions.length > 1 && !isCurrent) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs sm:text-sm h-7 sm:h-8"
                            onClick={() => handleViewDiff(version)}
                          >
                            <GitCompare className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                            <span className="hidden sm:inline">View Diff</span>
                          </Button>
                        ) : null}
                        
                        {canRestore && !isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs sm:text-sm h-7 sm:h-8"
                            onClick={() => handleRestore(version)}
                            disabled={isRestoring}
                          >
                            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                            <span className="hidden sm:inline">
                              {isRestoring ? 'Restoring...' : 'Restore'}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Preview Dialog */}
      {previewVersion && (
        <AssetPreviewDialog
          asset={{
            ...file,
            file_url: previewVersion.fileUrl || file.file_url,
          }}
          onOpenChange={(open) => !open && setPreviewVersion(null)}
        />
      )}

      {/* Diff Viewer */}
      {diffVersions && (
        <DiffViewer
          file={file}
          oldVersion={diffVersions.old}
          newVersion={diffVersions.new}
          open={!!diffVersions}
          onOpenChange={(open) => !open && setDiffVersions(null)}
        />
      )}
    </Dialog>
  );
}

