
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DataItemType, EnrichedDataItem, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { uploadAssetClient } from "@/lib/asset-service";
import { Loader2 } from "lucide-react";

interface UploadAssetDialogProps {
  children: React.ReactNode;
  user: User;
  onAssetCreated: (asset: EnrichedDataItem) => void;
  availableUsers?: User[];
}

export function UploadAssetDialog({
  children,
  user,
  onAssetCreated,
  availableUsers = [],
}: UploadAssetDialogProps) {
  const [assetType, setAssetType] = useState<DataItemType>("link");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  const shareTargets = useMemo(
    () => availableUsers.filter((candidate) => candidate.id !== user.id),
    [availableUsers, user.id],
  );

  const toggleSharedUser = (userId: string) => {
    setSharedWith((prev) => {
      const updated = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      // Update selectAll state based on whether all users are selected
      setSelectAll(updated.length === shareTargets.length && shareTargets.length > 0);
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSharedWith([]);
      setSelectAll(false);
    } else {
      setSharedWith(shareTargets.map((u) => u.id));
      setSelectAll(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    const formData = new FormData(form);
    const fileField = formData.get("file");
    const file = fileField instanceof File && fileField.size > 0 ? fileField : null;

    setIsSubmitting(true);
    const result = await uploadAssetClient({
      title: (formData.get("title") as string) ?? "",
      type: assetType,
      linkUrl: formData.get("link_url")?.toString() ?? null,
      textContent: formData.get("text_content")?.toString() ?? null,
      file,
      currentUser: user,
      sharedWithUserIds: sharedWith,
    });
    setIsSubmitting(false);

    if (!result.success) {
       toast({
        variant: "destructive",
        title: "Upload Failed",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Asset Uploaded",
      description: `"${result.asset.title}" has been added to the vault.`,
      });

    onAssetCreated(result.asset);
    form.reset();
    setAssetType("link");
    setSharedWith([]);
    setSelectAll(false);
    setOpen(false);
  };

  const renderContentField = () => {
    switch (assetType) {
      case "document":
      case "image":
        return (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
          </div>
        )
      case "link":
        return (
          <div>
            <Label htmlFor="link_url">URL</Label>
            <Input id="link_url" name="link_url" placeholder="https://example.com" required />
          </div>
        )
      case "key":
        return (
          <div>
            <Label htmlFor="text_content">Key Value</Label>
            <Textarea
              id="text_content"
              name="text_content"
              placeholder="Enter your secret key here"
              className="font-mono"
              required
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
          <DialogDescription>
            Upload a new asset to the company vault. Select the type and fill in the details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="title">Asset Name</Label>
              <Input id="title" name="title" placeholder="e.g., Q3 Financial Report" required />
            </div>

            <div>
                <Label htmlFor="asset-type">Asset Type</Label>
                <Select name="type" value={assetType} onValueChange={(value) => setAssetType(value as DataItemType)}>
                    <SelectTrigger id="asset-type">
                        <SelectValue placeholder="Select an asset type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="key">Key</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                </Select>
            </div>

          {renderContentField()}

          {shareTargets.length > 0 && (
            <div>
              <Label>Share with teammates</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                  <span>All</span>
                </label>
                {shareTargets.map((candidate) => (
                  <label key={candidate.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={sharedWith.includes(candidate.id)}
                      onChange={() => toggleSharedUser(candidate.id)}
                    />
                    <span>{candidate.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
