import { useState, useEffect } from 'react';
import type { User, Asset, ActivityLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList } from "./AssetList";
import { UserManagement } from "./UserManagement";
import { ActivityLogList } from "./ActivityLog";

type EnrichedAsset = Asset & { uploader?: User };
type EnrichedActivityLog = ActivityLog & { user?: User };

interface DashboardProps {
  currentUser: User;
  users: User[];
  assets: EnrichedAsset[];
  activityLogs: EnrichedActivityLog[];
}

export function Dashboard({ currentUser, users, assets: initialAssets, activityLogs: initialActivityLogs }: DashboardProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [activityLogs, setActivityLogs] = useState(initialActivityLogs);

  useEffect(() => {
    // This is where you would subscribe to real-time updates from your backend
    // For now, we are simulating updates via document events
    const handleAssetUpdate = (event: Event) => {
      const { asset, log } = (event as CustomEvent).detail;
      setAssets(prevAssets => [asset, ...prevAssets]);
      setActivityLogs(prevLogs => [log, ...prevLogs]);
    };

    document.addEventListener('assetUploaded', handleAssetUpdate);
    return () => {
      document.removeEventListener('assetUploaded', handleAssetUpdate);
    };
  }, []);

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
