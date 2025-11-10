"use client"

import { useState, useRef } from "react"
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
import type { AssetType, User, Asset, ActivityLog } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser } from "@/lib/data"


export function UploadAssetDialog({ children }: { children: React.ReactNode }) {
  const [assetType, setAssetType] = useState<AssetType>("link")
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const nameRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const handleUpload = () => {
    const currentUser = getCurrentUser(); // In real app, get from session
    const name = nameRef.current?.value;
    const content = contentRef.current?.value;

    if (!name || !content) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please fill out all fields to upload an asset.",
        });
        return;
    }

    const newAsset: Asset & { uploader: User } = {
        id: `asset-${Date.now()}`,
        name,
        type: assetType,
        content: assetType === 'image' ? 'https://picsum.photos/seed/placeholder/400/300' : content,
        uploaderId: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploader: currentUser,
    };

    const newLog: ActivityLog & { user: User } = {
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        action: 'UPLOADED',
        assetId: newAsset.id,
        assetName: newAsset.name,
        timestamp: new Date().toISOString(),
        user: currentUser,
    };

    // This is a mock implementation. In a real app, you would make an API call here.
    // We're using a custom event to simulate a real-time update.
    document.dispatchEvent(new CustomEvent('assetUploaded', { detail: { asset: newAsset, log: newLog } }));

    toast({
        title: "Asset Uploaded",
        description: `"${name}" has been added to the vault.`,
    });
    setOpen(false); // Close the dialog
  }

  const renderContentField = () => {
    switch (assetType) {
      case "document":
      case "image":
        return (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input id="file" type="file" ref={contentRef} />
          </div>
        )
      case "link":
        return (
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input id="link-url" placeholder="https://example.com" ref={contentRef} />
          </div>
        )
      case "key":
        return (
          <div>
            <Label htmlFor="key-value">Key Value</Label>
            <Textarea
              id="key-value"
              placeholder="Enter your secret key here"
              className="font-mono"
              ref={contentRef}
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
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="asset-type" className="text-right">
              Type
            </Label>
            <Select onValueChange={(value: AssetType) => setAssetType(value)} defaultValue="link">
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
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              ref={nameRef}
              placeholder="e.g. Production API Key"
              className="col-span-3"
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
          <Button onClick={handleUpload}>Upload Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
