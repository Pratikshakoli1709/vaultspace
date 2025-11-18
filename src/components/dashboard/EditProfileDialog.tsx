
"use client"

import React, { useState, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@/lib/types";

interface EditProfileDialogProps {
  children: React.ReactNode;
  user: UserType;
  onUserUpdate: (user: UserType) => void;
}

export function EditProfileDialog({ children, user, onUserUpdate }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    const updatedUser = {
      ...user,
      name,
      avatarUrl: avatar,
    };
    onUserUpdate(updatedUser);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Profile</DialogTitle>
          <DialogDescription className="text-sm">
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4 py-4">
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="text-lg sm:text-xl">{name.charAt(0)}</AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </button>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm sm:text-base">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
            <Input id="email" value={user.email} disabled className="text-sm sm:text-base h-9 sm:h-10" />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto text-sm sm:text-base">
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} className="w-full sm:w-auto text-sm sm:text-base">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
