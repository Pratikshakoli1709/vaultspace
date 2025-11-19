
"use client"
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Home, Settings, Shield, LogOut, Sparkles } from "lucide-react"
import { User } from "@/lib/types"
import { Logo } from "./Logo"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/SupabaseProvider"

export function AppSidebar({ user }: { user: User }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { signOut } = useSupabase();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
        router.refresh();
    }
    
    const dashboardPath = user.role === 'admin' ? '/adminDashboard' : '/userDashboard';
    const settingsPath = `/settings`;
    const adminPanelPath = `/adminDashboard?tab=users`;


    return (
        <Sidebar>
            <SidebarHeader className="h-14 sm:h-16 flex items-center gap-2 px-3 sm:px-4">
                <Logo />
                <div className="flex flex-col min-w-0">
                    <h2 className="text-sm sm:text-base md:text-lg font-semibold text-sidebar-foreground tracking-tighter truncate">
                        VaultSpace
                    </h2>
                </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href={dashboardPath}>
                          <SidebarMenuButton tooltip="Dashboard" isActive={pathname.includes('Dashboard')}>
                                <Home />
                                <span>Dashboard</span>
                          </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    {user.role === 'admin' && (
                        <SidebarMenuItem>
                            <Link href={adminPanelPath}>
                                <SidebarMenuButton tooltip="Admin Panel" isActive={pathname.includes('adminDashboard') && searchParams.get('tab') === 'users'}>
                                    <Shield />
                                    <span>Admin Panel</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                       <Link href={settingsPath}>
                            <SidebarMenuButton tooltip="Settings" isActive={pathname === '/settings'}>
                                <Settings />
                                <span>Settings</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/ai-assistant">
                            <SidebarMenuButton tooltip="AI Assistant" isActive={pathname === '/ai-assistant'}>
                                <Sparkles />
                                <span>AI Assistant</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2">
                 <Separator className="my-2 bg-sidebar-border" />
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout}>
                             <LogOut />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
