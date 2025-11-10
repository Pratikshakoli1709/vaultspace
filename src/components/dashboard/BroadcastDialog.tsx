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
import { Textarea } from "@/components/ui/textarea"
import { Megaphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function BroadcastDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast();

  const handleBroadcast = (event: React.FormEvent<HTMLFormElement>) => {
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

    // In a real app, this would call a server action to create a notification for all users.
    console.log("BROADCASTING:", { title, message });

    toast({
        title: "Broadcast Sent!",
        description: "Your notification has been sent to all users.",
    });

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
            This message will be sent as a notification to all users.
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
          <DialogFooter>
            <Button type="submit">Send Broadcast</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
