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
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl truncate">{asset.title}</DialogTitle>
                <DialogDescription asChild>
                    <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span>Asset type: {asset.type}</span>
                                {asset.category && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">Category: {asset.category}</span>
                                    </>
                                )}
                                {asset.uploader && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="flex items-center gap-2">
                                            <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                                                <AvatarImage src={asset.uploader.avatarUrl} />
                                                <AvatarFallback className="text-xs">{asset.uploader.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">Uploaded by {asset.uploader.name}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                            {asset.tags && asset.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {asset.tags.map((tag, index) => (
                                        <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {asset.ai_summary && (
                                <div className="mt-2 p-3 bg-muted rounded-md border-l-2 border-primary">
                                    <p className="font-medium text-xs sm:text-sm mb-1">AI Summary:</p>
                                    <p className="text-xs sm:text-sm text-foreground">{asset.ai_summary}</p>
                                </div>
                            )}
                            <span>
                                Uploaded {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                            </span>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] sm:max-h-[70vh] overflow-auto rounded-md border">
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
                         <iframe src={contentUrl} className="w-full h-[50vh] sm:h-[70vh]" title={asset.title} />
                    )}
                    {!isImage && !isPDF && (
                        <div className="p-6 sm:p-8 text-center text-sm sm:text-base text-muted-foreground">
                            Preview is not available for this file type.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}