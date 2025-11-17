
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getNotifications } from '@/lib/data';
import type { EnrichedNotification, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabase } from '@/components/SupabaseProvider';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseClient';
import { getRealDataItems } from '@/lib/data';
import { getRealActivityLogs } from '@/lib/data';
import { Loader2 } from 'lucide-react';


function SettingsPageContent() {
  const router = useRouter();
  const { user: supabaseUser, isLoading } = useSupabase();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!supabaseUser) {
        router.push('/login');
      } else {
        setCurrentUser(supabaseUser);
      }
    }
  }, [supabaseUser, isLoading, router]);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
    }
  }, [currentUser?.id, currentUser?.name]);

  useEffect(() => {
    if (!supabaseUser?.id) return;
    void (async () => {
      const data = await getNotifications(supabaseUser.id);
      setNotifications(data);
    })();
  }, [supabaseUser?.id]);

  const handleUpdateProfile = async () => {
    if (!currentUser || !supabaseUser) return;

    const trimmedName = profileName.trim();
    if (!trimmedName) {
      toast({
        title: 'Validation Error',
        description: 'Full name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName === currentUser.name) {
      toast({
        title: 'No Changes',
        description: 'Profile name is unchanged.',
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', currentUser.id)
        .select('id, full_name, email, avatar_url, role, created_at')
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Failed to update profile.');
      }

      if (!updatedProfile) {
        throw new Error('Profile not found.');
      }

      const { mapProfileRowToUser } = await import('@/lib/supabase-mappers');
      const updatedUser = mapProfileRowToUser(updatedProfile);

      setCurrentUser(updatedUser);
      
      // Update the SupabaseProvider context if it has a setter
      // The Header will receive the updated user via onUserUpdate
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Failed to update profile', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleExportData = async () => {
    if (!currentUser || !supabaseUser) return;

    setIsExportingData(true);
    try {
      const [assets, activityLogs] = await Promise.all([
        getRealDataItems().then((items) =>
          items.filter(
            (item) =>
              item.created_by === currentUser.id ||
              (item.uploader?.role === 'admin' && item.uploader?.id !== currentUser.id) ||
              item.sharedWith?.includes(currentUser.id),
          ),
        ),
        getRealActivityLogs().then((logs) => logs.filter((log) => log.user_id === currentUser.id)),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        },
        assets: assets.map((asset) => ({
          id: asset.id,
          title: asset.title,
          type: asset.type,
          file_url: asset.file_url,
          link_url: asset.link_url,
          text_content: asset.text_content,
          created_at: asset.created_at,
          updated_at: asset.updated_at,
        })),
        activityLogs: activityLogs.map((log) => ({
          id: log.id,
          action: log.action,
          item_title: log.item_title,
          timestamp: log.timestamp,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vaultspace-export-${currentUser.id}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data Exported',
        description: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to export data', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingData(false);
    }
  };

  if (isLoading || !currentUser) {
    return <div>Loading...</div>;
  }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar user={currentUser} />
                <SidebarInset className="flex flex-1 flex-col bg-background main-layout-content-column">
                    <Header
                      user={currentUser}
                      notifications={notifications}
                      onAssetCreated={() => {}}
                      onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
                    />
                    <main className="flex-1 w-full flex justify-center">
                      <div className="dashboard-content-wrapper space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <div className="space-y-8">
                          
                          {/* My Profile Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle>My Profile</CardTitle>
                              <CardDescription>Manage your personal information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                  id="name"
                                  value={profileName}
                                  onChange={(event) => setProfileName(event.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" defaultValue={currentUser.email} disabled />
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                                {isUpdatingProfile ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  'Update Profile'
                                )}
                              </Button>
                            </CardFooter>
                          </Card>

                          {/* Appearance Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Appearance</CardTitle>
                              <CardDescription>Customize the look and feel of the application.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label>Theme</Label>
                                    {isMounted ? (
                                      <div className="flex items-center space-x-2">
                                           <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
                                           <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
                                           <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}>System</Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-2">
                                        <Skeleton className="h-10 w-[65.5px]" />
                                        <Skeleton className="h-10 w-[60px]" />
                                        <Skeleton className="h-10 w-[74px]" />
                                      </div>
                                    )}
                                </div>
                            </CardContent>
                          </Card>
                          
                          {/* Account Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Account</CardTitle>
                              <CardDescription>Manage your account settings and data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Export Data</h4>
                                    <p className="text-sm text-muted-foreground mb-3">Download a copy of all your assets and activity logs.</p>
                                    <Button variant="outline" onClick={handleExportData} disabled={isExportingData}>
                                        {isExportingData ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Exporting...
                                          </>
                                        ) : (
                                          'Export My Data'
                                        )}
                                    </Button>
                                </div>
                                <div>
                                    <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
                                    <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                    <Button variant="destructive">Delete My Account</Button>
                                </div>
                            </CardContent>
                          </Card>

                        </div>
                      </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}


export default function SettingsPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <SettingsPageContent />
    </React.Suspense>
  );
}

