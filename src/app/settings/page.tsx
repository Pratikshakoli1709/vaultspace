
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
import { Loader2, FileText, FileDown, Calendar, Clock } from 'lucide-react';
import { exportToCSV, exportToPDF, prepareExportData, type ExportFormat } from '@/lib/export-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [dateRange, setDateRange] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6'>('all');

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
      const now = new Date();
      
      // Determine date filter based on selected range
      let dateFilter: (date: Date | string | null | undefined) => boolean;
      
      if (dateRange === 'all') {
        // No date filtering - export all data
        dateFilter = () => true;
      } else {
        // Calculate the start date based on number of months ago
        const monthsAgo = parseInt(dateRange, 10);
        const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate(), 0, 0, 0, 0);
        
        // Filter: from X months ago until now
        dateFilter = (date) => {
          if (!date) return false;
          const itemDate = new Date(date);
          return itemDate >= startDate && itemDate <= now;
        };
      }

      const [allAssets, allActivityLogs] = await Promise.all([
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

      // Apply date filters
      const assets = allAssets.filter((item) => dateFilter(item.created_at));
      const activityLogs = allActivityLogs.filter((log) => dateFilter(log.timestamp));

      const exportData = prepareExportData(assets, activityLogs, currentUser);

      // Export based on selected format
      if (exportFormat === 'csv') {
        exportToCSV(exportData);
      } else {
        exportToPDF(exportData);
      }

      const rangeText = 
        dateRange === 'all' ? 'All Data' :
        `${dateRange} month${dateRange === '1' ? '' : 's'} ago to today`;
      
      toast({
        title: 'Data Exported',
        description: `${rangeText} has been exported as ${exportFormat.toUpperCase()} successfully.`,
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
        <SidebarInset className="flex flex-grow flex-col bg-background main-layout-content-column">
          <div className="dashboard-dynamic-margin">
                    <Header
                      user={currentUser}
                      notifications={notifications}
                      onAssetCreated={() => {}}
                      onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
                    />
            <main className="w-full overflow-x-hidden">
              <div className="w-full px-6 xl:px-10 2xl:px-16">
                <div className="w-full space-y-6 sm:space-y-8 py-4 sm:py-6">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
                  <div className="space-y-6 sm:space-y-8">
                          {/* My Profile Section */}
                          <Card>
                            <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">My Profile</CardTitle>
                        <CardDescription className="text-sm">Manage your personal information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm sm:text-base">Full Name</Label>
                                <Input
                                  id="name"
                                  value={profileName}
                                  onChange={(event) => setProfileName(event.target.value)}
                            className="text-sm sm:text-base h-9 sm:h-10"
                                />
                              </div>
                              <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
                          <Input id="email" type="email" defaultValue={currentUser.email} disabled className="text-sm sm:text-base h-9 sm:h-10" />
                              </div>
                            </CardContent>
                      <CardFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="w-full sm:w-auto text-sm sm:text-base">
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
                        <CardTitle className="text-lg sm:text-xl">Appearance</CardTitle>
                        <CardDescription className="text-sm">Customize the look and feel of the application.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                          <Label className="text-sm sm:text-base">Theme</Label>
                                    {isMounted ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="text-sm sm:text-base h-9 sm:h-10">Light</Button>
                              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="text-sm sm:text-base h-9 sm:h-10">Dark</Button>
                              <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')} className="text-sm sm:text-base h-9 sm:h-10">System</Button>
                                      </div>
                                    ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <Skeleton className="h-9 sm:h-10 w-[65.5px]" />
                              <Skeleton className="h-9 sm:h-10 w-[60px]" />
                              <Skeleton className="h-9 sm:h-10 w-[74px]" />
                                      </div>
                                    )}
                                </div>
                            </CardContent>
                          </Card>
                          
                          {/* Account Section */}
                          <Card>
                            <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Account</CardTitle>
                        <CardDescription className="text-sm">Manage your account settings and data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                          <h4 className="font-medium mb-2 text-sm sm:text-base">Export Data</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3">Download a copy of your assets and activity logs.</p>
                          
                          {/* Date Range Selection */}
                          <div className="mb-4 space-y-3">
                            <Label className="text-xs sm:text-sm font-medium">Select Date Range</Label>
                            <RadioGroup value={dateRange === 'all' ? 'all' : 'months'} onValueChange={(value) => {
                              if (value === 'all') {
                                setDateRange('all');
                              } else if (dateRange === 'all') {
                                setDateRange('1');
                              }
                            }} className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="range-all" />
                                <Label htmlFor="range-all" className="text-xs sm:text-sm font-normal cursor-pointer flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>All Data</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="months" id="range-months" />
                                <Label htmlFor="range-months" className="text-xs sm:text-sm font-medium cursor-pointer">
                                  Export from specific time:
                                </Label>
                              </div>
                            </RadioGroup>
                            {dateRange !== 'all' && (
                              <div className="ml-6 mt-2">
                                <Select value={dateRange} onValueChange={(value) => setDateRange(value as '1' | '2' | '3' | '4' | '5' | '6')}>
                                  <SelectTrigger className="w-full sm:w-[200px] text-sm sm:text-base h-9 sm:h-10">
                                    <SelectValue placeholder="Select months" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>1 month ago</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>2 months ago</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="3">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>3 months ago</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>4 months ago</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="5">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>5 months ago</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="6">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>6 months ago</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Exporting data from {dateRange} month{dateRange === '1' ? '' : 's'} ago to today
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                              <SelectTrigger className="w-full sm:w-[180px] text-sm sm:text-base h-9 sm:h-10">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span>PDF</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="csv">
                                  <div className="flex items-center gap-2">
                                    <FileDown className="h-4 w-4" />
                                    <span>CSV</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={handleExportData} disabled={isExportingData} className="w-full sm:w-auto text-sm sm:text-base">
                                        {isExportingData ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Exporting...
                                          </>
                                        ) : (
                                          <>
                                            {exportFormat === 'pdf' ? (
                                              <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Export as PDF
                                              </>
                                            ) : (
                                              <>
                                                <FileDown className="mr-2 h-4 w-4" />
                                                Export as CSV
                                              </>
                                            )}
                                          </>
                                        )}
                                    </Button>
                          </div>
                                </div>
                                <div>
                          <h4 className="font-medium text-destructive mb-2 text-sm sm:text-base">Delete Account</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                          <Button variant="destructive" className="w-full sm:w-auto text-sm sm:text-base">Delete My Account</Button>
                                </div>
                            </CardContent>
                          </Card>
                  </div>
                        </div>
                      </div>
                    </main>
          </div>
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

