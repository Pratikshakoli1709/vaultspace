
'use client';

import type { User } from "@/lib/types";
import type { EnrichedDataItem, EnrichedActivityLog } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetList } from "./AssetList";
import { Activity, Archive, Users } from "lucide-react";

interface DashboardProps {
  currentUser: User;
  assets: EnrichedDataItem[];
  activityLogs: EnrichedActivityLog[];
}

export function Dashboard({ currentUser, assets, activityLogs }: DashboardProps) {

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

  // Regular user view
  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUser.name.split(' ')[0]}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Your Assets" value={assets.length} icon={Archive} />
          <StatCard title="Your Recent Activity" value={activityLogs.length} icon={Activity} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
            <CardDescription>Browse and manage your shared digital assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetList assets={assets} currentUser={currentUser} />
          </CardContent>
        </Card>
    </div>
  );
}
