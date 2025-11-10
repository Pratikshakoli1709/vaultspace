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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/types";
import { KeyRotationNotificationDialog } from "./KeyRotationNotificationDialog";
import { Button } from "../ui/button";
import { Bot } from "lucide-react";

interface UserManagementProps {
  users: User[];
}

export function UserManagement({ users }: UserManagementProps) {
  // In a real app, toggling the switch would call a server action to update the user's role.
  const handleRoleChange = (userId: string, newRole: User['role']) => {
    console.log(`Changing role for user ${userId} to ${newRole}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user roles and permissions for VaultSpace.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Label htmlFor={`admin-switch-${user.id}`} className="sr-only">Admin</Label>
                    <Switch
                      id={`admin-switch-${user.id}`}
                      checked={user.role === 'admin'}
                      onCheckedChange={(checked) => handleRoleChange(user.id, checked ? 'admin' : 'user')}
                      aria-label={`Toggle admin role for ${user.name}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Admin AI Tools</h3>
          <p className="text-sm text-muted-foreground">
            Use specialized tools to generate notifications for users.
          </p>
          <KeyRotationNotificationDialog>
            <Button variant="outline">
              <Bot className="mr-2 h-4 w-4" />
              Generate Key Rotation Notification
            </Button>
          </KeyRotationNotificationDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
