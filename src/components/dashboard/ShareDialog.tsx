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
import { Copy, Check, X, Eye, Edit } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FileWithVersions, User } from '@/lib/types';
import { updateShareLink } from '@/lib/file-actions-service';
import { Loader2 } from 'lucide-react';

interface ShareDialogProps {
  file: FileWithVersions;
  currentUser: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareUpdated?: (file: FileWithVersions) => void;
}

export function ShareDialog({ 
  file, 
  currentUser,
  open, 
  onOpenChange,
  onShareUpdated 
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shareAccess, setShareAccess] = useState<'view' | 'edit' | null>(
    file.shareAccess || file.sharedLink ? (file.shareAccess || 'view') : null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (open) {
      setShareAccess(file.shareAccess || file.sharedLink ? (file.shareAccess || 'view') : null);
    }
  }, [open, file]);

  // Generate a shareable link
  const shareUrl = shareAccess && typeof window !== 'undefined' 
    ? `${window.location.origin}/share/${file.id}`
    : '';
  
  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Share link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleAccessChange = async (access: 'view' | 'edit' | null) => {
    setIsUpdating(true);
    try {
      const result = await updateShareLink(file.id, access, currentUser);
      
      if (result.success) {
        setShareAccess(access);
        const updatedFile: FileWithVersions = {
          ...file,
          sharedLink: result.shareLink || null,
          shareAccess: access || undefined,
        };
        onShareUpdated?.(updatedFile);
        toast({
          title: 'Success',
          description: access ? 'Share link updated' : 'Share link revoked',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update share link',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update share link',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevoke = () => {
    handleAccessChange(null);
  };
  
  const handleWebShare = async () => {
    if (!shareUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.title,
          text: `Check out this file: ${file.title}`,
          url: shareUrl,
        });
        toast({
          title: 'Shared',
          description: 'File shared successfully',
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          toast({
            title: 'Error',
            description: 'Failed to share',
            variant: 'destructive',
          });
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share &quot;{file.title}&quot;</DialogTitle>
          <DialogDescription className="text-sm">
            Share this file with others using the link below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-3">
            <Label className="text-sm sm:text-base">Access Level</Label>
            <RadioGroup
              value={shareAccess || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  handleAccessChange(null);
                } else {
                  handleAccessChange(value as 'view' | 'edit');
                }
              }}
              disabled={isUpdating}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="view" id="view" />
                <Label htmlFor="view" className="flex items-center gap-2 cursor-pointer">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">View only</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="edit" />
                <Label htmlFor="edit" className="flex items-center gap-2 cursor-pointer">
                  <Edit className="h-4 w-4" />
                  <span className="text-sm">Can edit</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="flex items-center gap-2 cursor-pointer">
                  <X className="h-4 w-4" />
                  <span className="text-sm">No access (revoke link)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {shareAccess && (
            <div className="grid gap-2">
              <Label htmlFor="share-link" className="text-sm sm:text-base">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="text-sm sm:text-base h-9 sm:h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!shareUrl}
                  className="h-9 sm:h-10 px-3"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {shareAccess && navigator.share && (
            <Button
              variant="default"
              onClick={handleWebShare}
              disabled={isUpdating}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Share via...
            </Button>
          )}
          {shareAccess && (
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isUpdating}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Revoke Link'
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

