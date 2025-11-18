"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnrichedDataItem, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { updateAssetClient } from "@/lib/asset-service";
import { Loader2 } from "lucide-react";

interface EditAssetDialogProps {
  asset: EnrichedDataItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User;
  onAssetUpdated: (asset: EnrichedDataItem) => void;
}

export function EditAssetDialog({
  asset,
  open,
  onOpenChange,
  currentUser,
  onAssetUpdated,
}: EditAssetDialogProps) {
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (asset) {
      setTitle(asset.title);
      setTextContent(asset.text_content || "");
      setLinkUrl(asset.link_url || "");
    }
  }, [asset]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset) return;

    setIsSubmitting(true);
    const result = await updateAssetClient({
      assetId: asset.id,
      title,
      textContent: asset.type === 'key' ? textContent : undefined,
      linkUrl: asset.type === 'link' ? linkUrl : undefined,
      currentUser,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Asset Updated",
      description: `"${result.asset.title}" has been updated.`,
    });

    onAssetUpdated(result.asset);
    onOpenChange(false);
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit {asset.type === 'key' ? 'API Key' : asset.type === 'link' ? 'Link' : 'Asset'}</DialogTitle>
          <DialogDescription className="text-sm">
            Update the details for this asset.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:gap-4 py-4">
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="edit-title" className="text-sm sm:text-base">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
                className="text-sm sm:text-base h-9 sm:h-10"
              />
            </div>
            {asset.type === 'key' && (
              <div className="grid gap-1.5 sm:gap-2">
                <Label htmlFor="edit-key" className="text-sm sm:text-base">API Key</Label>
                <Textarea
                  id="edit-key"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={4}
                  placeholder="Enter the API key value"
                  className="text-sm sm:text-base font-mono min-h-[100px]"
                />
              </div>
            )}
            {asset.type === 'link' && (
              <div className="grid gap-1.5 sm:gap-2">
                <Label htmlFor="edit-link" className="text-sm sm:text-base">URL</Label>
                <Input
                  id="edit-link"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="https://example.com"
                  className="text-sm sm:text-base h-9 sm:h-10"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-sm sm:text-base">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

