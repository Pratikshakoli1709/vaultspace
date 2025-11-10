"use client";

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
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Eye, Trash2, Edit, ExternalLink } from "lucide-react";
import { Asset, User } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { AssetTypeIcon } from "../icons";
import { useToast } from "@/hooks/use-toast";

type EnrichedAsset = Asset & { uploader?: User };

interface AssetListProps {
  assets: EnrichedAsset[];
  currentUser: User;
}

export function AssetList({ assets, currentUser }: AssetListProps) {
    const { toast } = useToast();

    const handleCopy = (value: string, assetName: string) => {
        navigator.clipboard.writeText(value);
        toast({
            title: "Key Copied",
            description: `The key for "${assetName}" has been copied to your clipboard.`,
        });
        // In a real app, you would call a server action here to log this event.
        console.log(`User ${currentUser.name} copied key for ${assetName}`);
    };

  return (
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
          <TableRow key={asset.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <AssetTypeIcon type={asset.type} className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                    <span className="font-medium">{asset.name}</span>
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
              {formatDistanceToNow(new Date(asset.updatedAt), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {asset.type === 'key' && <DropdownMenuItem onSelect={() => handleCopy(asset.content, asset.name)}><Copy className="mr-2 h-4 w-4"/>Copy Key</DropdownMenuItem>}
                    {asset.type === 'link' && <DropdownMenuItem asChild><a href={asset.content} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>Open Link</a></DropdownMenuItem>}
                    {asset.type === 'image' && <DropdownMenuItem asChild><a href={asset.content} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4"/>View Image</a></DropdownMenuItem>}
                    {asset.type === 'document' && <DropdownMenuItem asChild><a href={asset.content} download><Eye className="mr-2 h-4 w-4"/>View Document</a></DropdownMenuItem>}
                    
                    {(currentUser.role === 'admin' || currentUser.id === asset.uploaderId) && (
                        <>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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
  );
}
