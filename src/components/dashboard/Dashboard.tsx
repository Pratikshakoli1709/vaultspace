'use client';

import type { User, EnrichedDataItem, EnrichedActivityLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetList } from "./AssetList";
import { Activity, Archive, Users } from "lucide-react";
import { DashboardWithFolders } from "./DashboardWithFolders";

interface DashboardProps {
  currentUser: User;
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
  onAssetDeleted?: (assetId: string) => void;
  onAssetUpdated?: (asset: EnrichedDataItem) => void;
  useFolderSystem?: boolean; // Toggle to use folder system or legacy view
}

export function Dashboard({ 
  currentUser, 
  assets, 
  activityLogs, 
  onAssetDeleted, 
  onAssetUpdated,
  useFolderSystem = true, // Default to folder system
}: DashboardProps) {

  // Use new folder system by default
  if (useFolderSystem) {
    return (
      <DashboardWithFolders
        currentUser={currentUser}
        assets={assets}
        activityLogs={activityLogs}
        onAssetDeleted={onAssetDeleted}
        onAssetUpdated={onAssetUpdated}
      />
    );
  }

  // Legacy view (original AssetList)
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {currentUser.name.split(' ')[0]}</h1>
      </div>
      <div className="w-full">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <StatCard title="Your Assets" value={assets.length} icon={Archive} />
          <StatCard title="Your Recent Activity" value={activityLogs.length} icon={Activity} />
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Your Assets</CardTitle>
          <CardDescription className="text-sm">Browse and manage your shared digital assets.</CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto p-0 sm:p-6">
          <div className="w-full min-w-0">
          <AssetList assets={assets} currentUser={currentUser} onAssetDeleted={onAssetDeleted} onAssetUpdated={onAssetUpdated} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
