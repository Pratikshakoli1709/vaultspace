"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import Image from "next/image"
import type { Asset } from "@/lib/types";

interface AssetPreviewDialogProps {
    asset: Asset | null;
    onOpenChange: (open: boolean) => void;
}

export function AssetPreviewDialog({ asset, onOpenChange }: AssetPreviewDialogProps) {
    if (!asset) return null;

    const isImage = asset.type === 'image';
    const isPDF = asset.type === 'document' && (asset.content.endsWith('.pdf') || asset.content === '/placeholder.pdf');

    return (
        <Dialog open={!!asset} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{asset.name}</DialogTitle>
                    <DialogDescription>
                        Asset type: {asset.type}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[70vh] overflow-auto rounded-md border">
                    {isImage && (
                        <Image 
                            src={asset.content} 
                            alt={asset.name} 
                            width={1200}
                            height={800}
                            className="w-full h-auto object-contain"
                        />
                    )}
                    {isPDF && (
                         <iframe src={asset.content} className="w-full h-[70vh]" title={asset.name} />
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
