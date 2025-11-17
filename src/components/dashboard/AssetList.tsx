
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Copy, Eye, Trash2, Edit, ExternalLink, Loader2 } from "lucide-react";
import type { DataItem, User } from "@/lib/types";
import { format } from "date-fns";
import { AssetTypeIcon } from "../icons";
import { useToast } from "@/hooks/use-toast";
import { AssetPreviewDialog } from "./AssetPreviewDialog";
import { EditAssetDialog } from "./EditAssetDialog";
import type { EnrichedDataItem } from "@/lib/types";
import { deleteAssetClient, logActivityClient } from "@/lib/asset-service";

interface AssetListProps {
  assets: EnrichedDataItem[];
  currentUser: User;
  onAssetDeleted?: (assetId: string) => void;
  onAssetUpdated?: (asset: EnrichedDataItem) => void;
}

export function AssetList({ assets, currentUser, onAssetDeleted, onAssetUpdated }: AssetListProps) {
    const { toast } = useToast();
    const [previewingAsset, setPreviewingAsset] = useState<DataItem | null>(null);
    const [editingAsset, setEditingAsset] = useState<EnrichedDataItem | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<DataItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleCopy = async (asset: DataItem) => {
        if (!asset.text_content) return;
        navigator.clipboard.writeText(asset.text_content);
        toast({
            title: "Key Copied",
            description: `The key for "${asset.title}" has been copied to your clipboard.`,
        });
        await logActivityClient({
          userId: currentUser.id,
          action: 'COPIED',
          itemId: asset.id,
          itemTitle: asset.title
        });
        
        // Notify admins when a key is copied
        if (asset.type === 'key') {
          const { notifyAllAdmins } = await import('@/lib/notifications');
          await notifyAllAdmins(
            `API Key "${asset.title}" was copied by ${currentUser.name || currentUser.email}`,
            currentUser.id,
          );
        }
    };
    
    const handleDelete = async () => {
        if (!deletingAsset) return;
        setIsDeleting(true);
        
        const result = await deleteAssetClient({ 
            assetId: deletingAsset.id,
            currentUser 
        });

        if (!result.success) {
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: result.error,
            });
            setIsDeleting(false);
            return;
        }

        toast({
            title: "Asset Deleted",
            description: `"${deletingAsset.title}" has been permanently removed.`,
        });

        // Log the activity
        void logActivityClient({
          userId: currentUser.id,
          action: 'DELETED',
          itemId: deletingAsset.id,
          itemTitle: deletingAsset.title
        });

        onAssetDeleted?.(deletingAsset.id);
        setDeletingAsset(null);
        setIsDeleting(false);
    }

    const canPerformAction = (asset: DataItem) => {
      return currentUser.role === 'admin' || currentUser.id === asset.created_by;
    }

    const canEditAsset = (asset: EnrichedDataItem) => {
      // For keys, allow uploader and admins to edit
      if (asset.type === 'key') {
        return currentUser.role === 'admin' || currentUser.id === asset.created_by;
      }
      return false;
    }

    const handleAssetUpdated = (updatedAsset: EnrichedDataItem) => {
      onAssetUpdated?.(updatedAsset);
      setEditingAsset(null);
    };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Uploader</TableHead>
            <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id} className="cursor-pointer" onClick={() => (asset.type === 'image' || asset.type === 'document') && setPreviewingAsset(asset)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <AssetTypeIcon type={asset.type} className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col">
                      <span className="font-medium">{asset.title}</span>
                      <Badge variant="outline" className="w-fit mt-1">{asset.type}</Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={asset.uploader?.avatarUrl} />
                    <AvatarFallback>{asset.uploader?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{asset.uploader?.name}</span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {format(new Date(asset.updated_at), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(asset.updated_at), 'h:mm a')}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {asset.type === 'key' && <DropdownMenuItem onSelect={() => handleCopy(asset)}><Copy className="mr-2 h-4 w-4"/>Copy Key</DropdownMenuItem>}
                      {asset.type === 'link' && asset.link_url && <DropdownMenuItem asChild><a href={asset.link_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>Open Link</a></DropdownMenuItem>}
                      {(asset.type === 'image' || asset.type === 'document') && <DropdownMenuItem onSelect={() => setPreviewingAsset(asset)}><Eye className="mr-2 h-4 w-4"/>Preview</DropdownMenuItem>}
                      
                      {canEditAsset(asset) && (
                        <DropdownMenuItem onSelect={() => setEditingAsset(asset)}>
                          <Edit className="mr-2 h-4 w-4"/>
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canPerformAction(asset) && (
                          <>
                              {canEditAsset(asset) && <DropdownMenuSeparator />}
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeletingAsset(asset)}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                <span>Delete</span>
                              </DropdownMenuItem>
                          </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AssetPreviewDialog asset={previewingAsset} onOpenChange={(open) => !open && setPreviewingAsset(null)} />
      
      <EditAssetDialog
        asset={editingAsset}
        open={!!editingAsset}
        onOpenChange={(open) => !open && setEditingAsset(null)}
        currentUser={currentUser}
        onAssetUpdated={handleAssetUpdated}
      />
      
      <AlertDialog open={!!deletingAsset} onOpenChange={(open) => !open && !isDeleting && setDeletingAsset(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the asset
                    <span className="font-bold"> &quot;{deletingAsset?.title}&quot; </span>
                    from the servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
