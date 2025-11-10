"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import Image from "next/image"
import type { DataItem } from "@/lib/types";

interface AssetPreviewDialogProps {
    asset: DataItem | null;
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
                    <DialogDescription>
                        Asset type: {asset.type}
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
