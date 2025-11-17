
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User } from "@/lib/types";
import type { EnrichedDataItem, EnrichedActivityLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList } from "./AssetList";
import { UserManagement } from "./UserManagement";
import { ActivityLogList } from "./ActivityLog";
import { AddUser } from "./AddUser";
import { Activity, Archive, Users } from "lucide-react";

interface ControlledDashboardProps {
  currentUser: User;
  users: User[];
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
  onAssetDeleted?: (assetId: string) => void;
  onAssetUpdated?: (asset: EnrichedDataItem) => void;
  onUserRoleUpdated?: (user: User) => void;
  onUserCreated?: () => void;
}

export function ControlledDashboard({
  currentUser,
  users,
  assets,
  activityLogs,
  onAssetDeleted,
  onAssetUpdated,
  onUserRoleUpdated,
  onUserCreated,
}: ControlledDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'assets';

  const onTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`${pathname}?${params.toString()}`);
  };

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

  return (
      <div className="space-y-6 w-full">
          <div className="w-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4 md:px-6 lg:px-8">
              <StatCard title="Total Users" value={users.length} icon={Users} />
              <StatCard title="Total Assets" value={assets.length} icon={Archive} />
              <StatCard title="Logged Activities" value={activityLogs.length} icon={Activity} />
            </div>
          </div>
          <Tabs value={tab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="assets">All Assets</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="add-user">Add User</TabsTrigger>
            </TabsList>
            <TabsContent value="assets">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>All Company Assets</CardTitle>
                  <CardDescription>Browse and manage all shared digital assets.</CardDescription>
                </CardHeader>
                <CardContent className="w-full overflow-x-auto">
                <AssetList assets={assets} currentUser={currentUser} onAssetDeleted={onAssetDeleted} onAssetUpdated={onAssetUpdated} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="activity">
              <ActivityLogList activityLogs={activityLogs} />
            </TabsContent>
            <TabsContent value="users">
              <UserManagement
                currentUser={currentUser}
                users={users}
                onUserRoleUpdated={onUserRoleUpdated}
              />
            </TabsContent>
            <TabsContent value="add-user">
              <AddUser
                currentUser={currentUser}
                onUserCreated={onUserCreated}
              />
            </TabsContent>
          </Tabs>
      </div>
    );
}
