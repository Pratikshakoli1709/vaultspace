
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
import { MoreHorizontal, Copy, Eye, Trash2, Edit, ExternalLink } from "lucide-react";
import { DataItem, User } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { AssetTypeIcon } from "../icons";
import { useToast } from "@/hooks/use-toast";
import { AssetPreviewDialog } from "./AssetPreviewDialog";
import { EnrichedDataItem } from "@/lib/data";
import { deleteAsset, logActivity } from "@/lib/actions";

interface AssetListProps {
  assets: EnrichedDataItem[];
  currentUser: User;
}

export function AssetList({ assets, currentUser }: AssetListProps) {
    const { toast } = useToast();
    const [previewingAsset, setPreviewingAsset] = useState<DataItem | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<DataItem | null>(null);

    const handleCopy = (asset: DataItem) => {
        if (!asset.text_content) return;
        navigator.clipboard.writeText(asset.text_content);
        toast({
            title: "Key Copied",
            description: `The key for "${asset.title}" has been copied to your clipboard.`,
        });
        logActivity({
          user_id: currentUser.id,
          action: 'COPIED',
          item_id: asset.id,
          item_title: asset.title
        });
    };
    
    const handleDelete = async () => {
        if (!deletingAsset) return;
        
        await deleteAsset(deletingAsset.id);

        toast({
            title: "Asset Deleted",
            description: `"${deletingAsset.title}" has been permanently removed.`,
        });

        // Log the activity
        logActivity({
          user_id: currentUser.id,
          action: 'DELETED',
          item_id: deletingAsset.id,
          item_title: deletingAsset.title
        });

        setDeletingAsset(null);
    }

    const canPerformAction = (asset: DataItem) => {
      return currentUser.role === 'admin' || currentUser.id === asset.created_by;
    }

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
                {formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true })}
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
                      
                      {canPerformAction(asset) && (
                          <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
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
      
      <AlertDialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
