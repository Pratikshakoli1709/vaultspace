
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
import type { DataItemType, User, DataItem } from "@/lib/types"
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

export function UploadAssetDialog({ children, user, onAssetUpload }: { children: React.ReactNode, user: User, onAssetUpload: (asset: DataItem) => void }) {
  const [assetType, setAssetType] = useState<DataItemType>("link")
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleUploadAction = async (formData: FormData) => {
    formData.append('type', assetType);
    formData.append('created_by', user.id);

    const result = await uploadAsset(formData);

    if (result.success && result.data) {
      toast({
        title: "Asset Uploaded",
        description: `"${formData.get('title')}" has been added to the vault.`,
      });
      onAssetUpload(result.data); // Call the callback to update parent state
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
        <form action={handleUploadAction} className="space-y-4 pt-4">
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

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
