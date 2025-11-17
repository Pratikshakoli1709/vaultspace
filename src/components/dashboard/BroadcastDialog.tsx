"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";
import { sendBroadcastNotification } from "@/lib/notifications";

interface BroadcastDialogProps {
  currentUser: User;
  targets: { id: string; name: string }[];
}

export function BroadcastDialog({ currentUser, targets }: BroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  const toggleRecipient = (userId: string) => {
    setSelectedUserIds((prev) => {
      const updated = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      // Update selectAll state based on whether all users are selected
      setSelectAll(updated.length === targets.length && targets.length > 0);
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUserIds([]);
      setSelectAll(false);
    } else {
      setSelectedUserIds(targets.map((t) => t.id));
      setSelectAll(true);
    }
  };

  const handleBroadcast = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get("title") as string;
    const message = formData.get("message") as string;

    if (!title || !message) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please provide a title and message for the broadcast.",
        });
        return;
    }

    if (selectedUserIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No recipients selected",
        description: "Choose at least one teammate to notify.",
      });
      return;
    }

    try {
      await sendBroadcastNotification({
        title,
        message,
        senderId: currentUser.id,
        recipients: selectedUserIds,
      });
    } catch (error) {
      console.error("Broadcast failed", error);
      toast({
        variant: "destructive",
        title: "Broadcast failed",
        description: "We could not send the notification. Try again shortly.",
      });
      return;
    }

    toast({
        title: "Broadcast Sent!",
        description: "Your notification has been sent.",
    });

    setSelectedUserIds([]);
    setSelectAll(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Megaphone className="mr-2 h-4 w-4" />
          Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Broadcast</DialogTitle>
          <DialogDescription>
            Select teammates to receive this announcement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g., Scheduled Maintenance" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" placeholder="Describe the announcement..." required />
          </div>
          <div className="space-y-2">
            <Label>Select recipients</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {targets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No teammates available.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                    <span>All</span>
                  </label>
                  {targets.map((target) => (
                    <label key={target.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedUserIds.includes(target.id)}
                        onChange={() => toggleRecipient(target.id)}
                      />
                      <span>{target.name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Send Broadcast</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
