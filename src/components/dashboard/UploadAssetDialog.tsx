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
import type { DataItemType, User, DataItem, ActivityLog } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"



export function UploadAssetDialog({ children, user }: { children: React.ReactNode, user: User }) {
  const [assetType, setAssetType] = useState<DataItemType>("link")
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const handleUpload = () => {
    const currentUser = user;
    const title = titleRef.current?.value;
    const contentValue = contentRef.current?.value;

    if (!title || (!contentValue && (assetType === 'link' || assetType === 'key'))) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please fill out all fields to upload an asset.",
        });
        return;
    }

    const now = new Date().toISOString();
    const newAsset: DataItem & { uploader: User } = {
        id: `item-${Date.now()}`,
        title,
        type: assetType,
        created_by: currentUser.id,
        created_at: now,
        updated_at: now,
        uploader: currentUser,
    };
    
    switch(assetType) {
        case 'link':
            newAsset.link_url = contentValue;
            break;
        case 'key':
            newAsset.text_content = contentValue;
            break;
        case 'image':
            newAsset.file_url = 'https://picsum.photos/seed/placeholder/400/300';
            break;
        case 'document':
             newAsset.file_url = '/placeholder.pdf';
             break;
    }


    const newLog: ActivityLog & { user: User } = {
        id: `log-${Date.now()}`,
        user_id: currentUser.id,
        action: 'UPLOADED',
        item_id: newAsset.id,
        item_title: newAsset.title,
        timestamp: now,
        user: currentUser,
    };

    // This is a mock implementation. In a real app, you would make an API call here.
    // We're using a custom event to simulate a real-time update.
    document.dispatchEvent(new CustomEvent('assetUploaded', { detail: { asset: newAsset, log: newLog } }));

    toast({
        title: "Asset Uploaded",
        description: `"${title}" has been added to the vault.`,
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
            <Input id="file" type="file" ref={contentRef as any} />
            <p className="text-xs text-muted-foreground">This is for demonstration purposes. File content is not actually uploaded.</p>
          </div>
        )
      case "link":
        return (
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input id="link-url" placeholder="https://example.com" ref={titleRef} />
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
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              ref={titleRef}
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
