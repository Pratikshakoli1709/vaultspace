"use client"

import { useState } from "react"
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
import type { AssetType } from "@/lib/types"

export function UploadAssetDialog({ children }: { children: React.ReactNode }) {
  const [assetType, setAssetType] = useState<AssetType>("link")

  const renderContentField = () => {
    switch (assetType) {
      case "document":
      case "image":
        return (
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">File</Label>
            <Input id="file" type="file" />
          </div>
        )
      case "link":
        return (
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input id="link-url" placeholder="https://example.com" />
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
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog>
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
          <Button type="submit">Upload Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
