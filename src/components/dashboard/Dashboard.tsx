'use client';

import type { User } from "@/lib/types";
import type { EnrichedDataItem, EnrichedActivityLog } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList } from "./AssetList";
import { UserManagement } from "./UserManagement";
import { ActivityLogList } from "./ActivityLog";
import { Activity, Archive, Users } from "lucide-react";

interface DashboardProps {
  currentUser: User;
  users: User[];
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
}

export function Dashboard({ currentUser, users, assets, activityLogs }: DashboardProps) {

  const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (currentUser.role === 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Users" value={users.length} icon={Users} />
          <StatCard title="Total Assets" value={assets.length} icon={Archive} />
          <StatCard title="Logged Activities" value={activityLogs.length} icon={Activity} />
        </div>
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
      </div>
    );
  }

  const userAssets = assets.filter(asset => asset.created_by === currentUser.id);
  const userActivity = activityLogs.filter(log => log.user_id === currentUser.id);

  // Regular user view
  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUser.name.split(' ')[0]}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Your Assets" value={userAssets.length} icon={Archive} />
          <StatCard title="Your Recent Activity" value={userActivity.length} icon={Activity} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
            <CardDescription>Browse and manage your shared digital assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetList assets={userAssets} currentUser={currentUser} />
          </CardContent>
        </Card>
    </div>
  );
}