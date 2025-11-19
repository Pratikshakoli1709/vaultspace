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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/types";
import { KeyRotationNotificationDialog } from "./KeyRotationNotificationDialog";
import { Button } from "../ui/button";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mapProfileRowToUser, type ProfileRow } from "@/lib/supabase-mappers";

interface UserManagementProps {
  currentUser: User;
  users: User[];
  onUserRoleUpdated?: (user: User) => void;
}

const ADMIN_EMAIL_ALLOWLIST = new Set(['atharv@gmail.com', 'ankita@gmail.com']);

export function UserManagement({ currentUser, users, onUserRoleUpdated }: UserManagementProps) {
  const canManageAdmins =
    currentUser.email !== undefined &&
    ADMIN_EMAIL_ALLOWLIST.has(currentUser.email.toLowerCase());

  const { toast } = useToast();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleRoleChange = async (user: User, newRole: User['role']) => {
    if (!canManageAdmins) {
      toast({
        title: "Insufficient permissions",
        description: "Only approved admins can change roles.",
        variant: "destructive",
      });
      return;
    }

    if (user.role === newRole) return;

    setPendingUserId(user.id);
    try {
      const response = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorId: currentUser.id,
          userId: user.id,
          role: newRole,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to update user role.');
      }

      const updatedProfile = result.user as ProfileRow | undefined;

      if (!updatedProfile) {
        throw new Error('Server did not return the updated user.');
      }

      const updatedUser = mapProfileRowToUser(updatedProfile);
      onUserRoleUpdated?.(updatedUser);

      toast({
        title: "Role updated",
        description: `${updatedUser.name} is now ${newRole === 'admin' ? 'an admin' : 'a standard user'}.`,
      });
    } catch (error) {
      console.error('Failed to update user role', error);
      toast({
        title: "Unable to update role",
        description: error instanceof Error ? error.message : 'Unexpected error occurred.',
        variant: "destructive",
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="dashboard-center w-full">
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
        <CardDescription className="text-sm">Manage user roles and permissions for VaultSpace.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-6">
        <div className="w-full min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="text-xs sm:text-sm">User</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                  <TableCell className="min-w-0 sm:min-w-[150px]">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="text-xs sm:text-sm">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                      <span className="font-medium text-sm sm:text-base truncate flex-1 min-w-0">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Label htmlFor={`admin-switch-${user.id}`} className="sr-only">Admin</Label>
                    <Switch
                      id={`admin-switch-${user.id}`}
                      checked={user.role === 'admin'}
                      disabled={!canManageAdmins || pendingUserId === user.id}
                      onCheckedChange={(checked) => {
                        void handleRoleChange(user, checked ? 'admin' : 'user');
                      }}
                      aria-label={`Toggle admin role for ${user.name}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-2 w-full">
          <h3 className="font-semibold text-sm sm:text-base">Admin AI Tools</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Use specialized tools to generate notifications for users.
          </p>
          <KeyRotationNotificationDialog>
            <Button variant="outline" className="w-full sm:w-auto text-sm">
              <Bot className="mr-2 h-4 w-4" />
              Generate Key Rotation Notification
            </Button>
          </KeyRotationNotificationDialog>
        </div>
      </CardFooter>
    </Card>
    </div>
  );
}
