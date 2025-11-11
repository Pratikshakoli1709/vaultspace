
'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getNotifications, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';


function SettingsPageContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // This would typically come from a global state or auth context
  const [currentUser, setCurrentUser] = React.useState<User>({
      id: 'user-1',
      name: name || 'Alex Johnson',
      email: name ? `${name.split(' ').join('.').toLowerCase()}@example.com` : 'alex.j@example.com',
      avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user-1')}`,
      role: 'admin',
      createdAt: '2024-07-20T10:00:00Z',
  });
  
  const notifications: EnrichedNotification[] = getNotifications();

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar user={currentUser} />
                <SidebarInset>
                    <Header user={currentUser} notifications={notifications} onAssetUpload={() => {}} onUserUpdate={setCurrentUser} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                      <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>
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
                                <Input id="name" defaultValue={currentUser.name} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" defaultValue={currentUser.email} disabled />
                              </div>
                            </CardContent>
                            <CardFooter>
                              <Button>Update Profile</Button>
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
                                    <Button variant="outline">Export My Data</Button>
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
