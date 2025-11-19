
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
import { TeamManagement } from "./TeamManagement";
import { Activity, Archive, Users, UsersRound } from "lucide-react";

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
      <div className="dashboard-center space-y-4 sm:space-y-6 w-full">
          <div className="w-full">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Total Users" value={users.length} icon={Users} />
              <StatCard title="Total Assets" value={assets.length} icon={Archive} />
              <StatCard title="Logged Activities" value={activityLogs.length} icon={Activity} />
            </div>
          </div>
          <Tabs value={tab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 max-w-full sm:max-w-3xl mx-auto h-auto gap-1 sm:gap-2">
              <TabsTrigger value="assets" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2">All Assets</TabsTrigger>
              <TabsTrigger value="activity" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2">Activity Log</TabsTrigger>
              <TabsTrigger value="users" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2">Users</TabsTrigger>
              <TabsTrigger value="teams" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2">Teams</TabsTrigger>
              <TabsTrigger value="add-user" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-2">Add User</TabsTrigger>
            </TabsList>
            <TabsContent value="assets" className="mt-4 sm:mt-6">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">All Company Assets</CardTitle>
                  <CardDescription className="text-sm">Browse and manage all shared digital assets.</CardDescription>
                </CardHeader>
                <CardContent className="w-full overflow-x-auto p-0 sm:p-6">
                  <div className="w-full min-w-0">
                    <AssetList assets={assets} currentUser={currentUser} onAssetDeleted={onAssetDeleted} onAssetUpdated={onAssetUpdated} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="activity" className="mt-4 sm:mt-6">
              <ActivityLogList activityLogs={activityLogs} />
            </TabsContent>
            <TabsContent value="users" className="mt-4 sm:mt-6">
              <UserManagement
                currentUser={currentUser}
                users={users}
                onUserRoleUpdated={onUserRoleUpdated}
              />
            </TabsContent>
            <TabsContent value="teams" className="mt-4 sm:mt-6">
              <TeamManagement currentUser={currentUser} />
            </TabsContent>
            <TabsContent value="add-user" className="mt-4 sm:mt-6">
              <AddUser
                currentUser={currentUser}
                onUserCreated={onUserCreated}
              />
            </TabsContent>
          </Tabs>
      </div>
    );
}
