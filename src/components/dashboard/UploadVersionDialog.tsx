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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { uploadNewVersion } from '@/lib/version-service';
import type { FileWithVersions, User } from '@/lib/types';

interface UploadVersionDialogProps {
  file: FileWithVersions;
  currentUser: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionUploaded?: (file: FileWithVersions) => void;
}

export function UploadVersionDialog({
  file,
  currentUser,
  open,
  onOpenChange,
  onVersionUploaded,
}: UploadVersionDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState(file.text_content || '');
  const [changelog, setChangelog] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTextContent(file.text_content || '');
      setChangelog('');
      setSelectedFile(null);
    }
  }, [open, file.text_content]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input based on file type
    if (file.type === 'key') {
      // For key files, text content is required
      if (!textContent.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter the key value',
          variant: 'destructive',
        });
        return;
      }
    } else if (file.type === 'document' || file.type === 'image') {
      // For document/image files, a file is required
      if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
      }
    } else if (file.type === 'link') {
      // For link files, we can update without a file
      // Just update the changelog
    }

    setIsUploading(true);
    
    try {
      const result = await uploadNewVersion({
        fileId: file.id,
        file: selectedFile || undefined,
        textContent: file.type === 'key' ? textContent.trim() : undefined,
        changelog: changelog.trim() || undefined,
        currentUser,
      });

      if (result.success && result.newVersion) {
        toast({
          title: 'Success',
          description: `Version ${result.newVersion.versionNumber} uploaded successfully`,
        });

        // Update file with new version
        const updatedFile: FileWithVersions = {
          ...file,
          currentVersion: result.newVersion.versionNumber,
          versions: [...(file.versions || []), result.newVersion],
        };

        onVersionUploaded?.(updatedFile);
        onOpenChange(false);
        
        // Reset form
        setSelectedFile(null);
        setChangelog('');
        setTextContent(file.text_content || '');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to upload version',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload version',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription className="text-sm">
            Upload a new version of &quot;{file.title}&quot;
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {file.type === 'key' && (
              <div className="grid gap-2">
                <Label htmlFor="textContent" className="text-sm sm:text-base">
                  Key Value *
                </Label>
                <Textarea
                  id="textContent"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter the new key value..."
                  disabled={isUploading}
                  className="text-sm sm:text-base min-h-[100px] font-mono"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Update the key value for this version
                </p>
              </div>
            )}

            {(file.type === 'document' || file.type === 'image') && (
              <div className="grid gap-2">
                <Label htmlFor="file" className="text-sm sm:text-base">
                  New File *
                </Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="text-sm sm:text-base h-9 sm:h-10"
                  required={file.type === 'document' || file.type === 'image'}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                {file.file_url && (
                  <p className="text-xs text-muted-foreground">
                    Current file: {file.file_url.split('/').pop()}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="changelog" className="text-sm sm:text-base">
                Changelog (Optional)
              </Label>
              <Textarea
                id="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Describe what changed in this version..."
                disabled={isUploading}
                className="text-sm sm:text-base min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isUploading || 
                (file.type === 'key' && !textContent.trim()) ||
                ((file.type === 'document' || file.type === 'image') && !selectedFile)
              }
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Version
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

