
"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { DataItemType, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { uploadAsset } from "@/lib/actions"
import { Loader2 } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Upload Asset
    </Button>
  );
}

export function UploadAssetDialog({ children, user }: { children: React.ReactNode, user: User }) {
  const [assetType, setAssetType] = useState<DataItemType>("link")
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleUploadAction = async (formData: FormData) => {
    formData.append('type', assetType);
    formData.append('created_by', user.id);

    // In a real app with file storage, you'd handle the file upload here
    // and get back a URL to save in the database.
    // For now, we'll continue using placeholders for file-based assets.
    if (assetType === 'image') {
        formData.append('file_url', `https://picsum.photos/seed/${Date.now()}/400/300`);
    } else if (assetType === 'document') {
        formData.append('file_url', '/placeholder.pdf');
    }

    const result = await uploadAsset(formData);

    if (result.success) {
      toast({
        title: "Asset Uploaded",
        description: `"${formData.get('title')}" has been added to the vault.`,
      });
      setOpen(false);
    } else {
       toast({
        variant: "destructive",
        title: "Upload Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
  }

  const renderContentField = () => {
    switch (assetType) {
      case "document":
      case "image":
        return (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
            <p className="text-xs text-muted-foreground">File content is not stored. This is a demo.</p>
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
        <form action={handleUploadAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-type" className="text-right">
                Type
              </Label>
              <Select onValueChange={(value: DataItemType) => setAssetType(value)} defaultValue="link">
                <SelectTrigger id="asset-type" className="col-span-3">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="key">Environment Key</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Name
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Production API Key"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Content</Label>
              <div className="col-span-3">
                  {renderContentField()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
