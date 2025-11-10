
'use client';

import type { User } from "@/lib/types";
import type { EnrichedDataItem, EnrichedActivityLog } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList } from "./AssetList";
import { UserManagement } from "./UserManagement";
import { ActivityLogList } from "./ActivityLog";

interface DashboardProps {
  currentUser: User;
  users: User[];
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
}

export function Dashboard({ currentUser, users, assets, activityLogs }: DashboardProps) {

  if (currentUser.role === 'admin') {
    return (
      <Tabs defaultValue="assets">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="assets">All Assets</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>All Company Assets</CardTitle>
              <CardDescription>Browse and manage all shared digital assets.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetList assets={assets} currentUser={currentUser} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLogList activityLogs={activityLogs} />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement users={users} />
        </TabsContent>
      </Tabs>
    );
  }

  // Regular user view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Assets</CardTitle>
        <CardDescription>Browse and manage shared digital assets.</CardDescription>
      </CardHeader>
      <CardContent>
        <AssetList assets={assets} currentUser={currentUser} />
      </CardContent>
    </Card>
  );
}
