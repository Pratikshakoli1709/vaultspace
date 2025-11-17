"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns";
import type { EnrichedDataItem } from "@/lib/types";

interface AssetPreviewDialogProps {
    asset: EnrichedDataItem | null;
    onOpenChange: (open: boolean) => void;
}

export function AssetPreviewDialog({ asset, onOpenChange }: AssetPreviewDialogProps) {
    if (!asset) return null;

    const isImage = asset.type === 'image' && asset.file_url;
    const isPDF = asset.type === 'document' && asset.file_url && (asset.file_url.endsWith('.pdf') || asset.file_url === '/placeholder.pdf');
    const contentUrl = asset.file_url || '';

    return (
        <Dialog open={!!asset} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{asset.title}</DialogTitle>
                    <DialogDescription asChild>
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span>Asset type: {asset.type}</span>
                                {asset.uploader && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={asset.uploader.avatarUrl} />
                                                <AvatarFallback>{asset.uploader.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            Uploaded by {asset.uploader.name}
                                        </span>
                                    </>
                                )}
                            </div>
                            <span>
                                Uploaded {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                            </span>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[70vh] overflow-auto rounded-md border">
                    {isImage && (
                        <Image 
                            src={contentUrl} 
                            alt={asset.title} 
                            width={1200}
                            height={800}
                            className="w-full h-auto object-contain"
                        />
                    )}
                    {isPDF && (
                         <iframe src={contentUrl} className="w-full h-[70vh]" title={asset.title} />
                    )}
                    {!isImage && !isPDF && (
                        <div className="p-8 text-center text-muted-foreground">
                            Preview is not available for this file type.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}