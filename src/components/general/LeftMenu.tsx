import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useProfileStore } from "@/store/profile";
import { Tabs, useUiStore } from "@/store/ui";
import { motion } from "framer-motion";
import { BicepsFlexed, BookCheck, File, Landmark, LogOut, PersonStanding, Plus, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

const FUNNY_QUOTES = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Innovation distinguishes between a leader and a follower. - Steve Jobs",
    "Stay hungry, stay foolish. - Steve Jobs",
    "Wish you were hired! - CV Maker",
    "I have not failed. I've just found 10,000 ways that won't work. - Thomas Edison",
    "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful. - Albert Schweitzer",
    "The best way to predict the future is to invent it. - Alan Kay",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
]

export default function SideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [quote, setQuote] = useState<string>("");
    const { setSelectedTab, selectedTab } = useUiStore();
    const { profile, logout } = useProfileStore();

    useEffect(() => {
        const setRandom = () => setQuote(FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]);
        setRandom();
        const id = setInterval(() => {
            setRandom();
        }, 600000);
        return () => clearInterval(id);
    }, []);

    const handleSettings = () => {
        setSelectedTab(Tabs.SETTINGS);
    }

    const handleLogout = () => {
        logout();
        setSelectedTab(Tabs.PROFILE_SELECTOR);
    }

    return (
        <Sidebar side="left" {...props}>
            <SidebarHeader>
                <h3 className="text-center text-xl font-bold">{profile?.firstName || "tot"} {profile?.lastName}</h3>
                <Button variant={"destructive"} onClick={handleLogout}>
                    <LogOut />
                </Button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Edit your profile</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.PERSONAL)}>
                                <SidebarMenuButton className={cn("text-white rounded-md transition-all", { "bg-primary/50": selectedTab === Tabs.PERSONAL }, { "bg-primary": selectedTab !== Tabs.PERSONAL })}>
                                    Personal Information
                                </SidebarMenuButton>
                                <SidebarMenuBadge><PersonStanding className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.EDUCATION)}>
                                <SidebarMenuButton className={cn("text-white rounded-md transition-all", { "bg-primary/50": selectedTab === Tabs.EDUCATION }, { "bg-primary": selectedTab !== Tabs.EDUCATION })}>
                                    Education
                                </SidebarMenuButton>
                                <SidebarMenuBadge><BookCheck className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.EXPERIENCE)}>
                                <SidebarMenuButton className={cn("text-white rounded-md transition-all", { "bg-primary/50": selectedTab === Tabs.EXPERIENCE }, { "bg-primary": selectedTab !== Tabs.EXPERIENCE })}>
                                    Experience
                                </SidebarMenuButton>
                                <SidebarMenuBadge><Landmark className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.PROJECTS)}>
                                <SidebarMenuButton className={cn("text-white rounded-md transition-all", { "bg-primary/50": selectedTab === Tabs.PROJECTS }, { "bg-primary": selectedTab !== Tabs.PROJECTS })}>
                                    Projects
                                </SidebarMenuButton>
                                <SidebarMenuBadge><File className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.SKILLS)}>
                                <SidebarMenuButton className={cn("text-white rounded-md transition-all", { "bg-primary/50": selectedTab === Tabs.SKILLS }, { "bg-primary": selectedTab !== Tabs.SKILLS })}>
                                    Skills
                                </SidebarMenuButton>
                                <SidebarMenuBadge><BicepsFlexed className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Write your CV</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.CVMAKER)}>
                                <SidebarMenuButton className="bg-primary text-white rounded-md transition-all">Create your CV</SidebarMenuButton>
                                <SidebarMenuBadge><Plus className="text-white" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <motion.p 
                    className="italic text-center text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {quote}
                </motion.p>
                {/* <Button variant={"ghost"} className="text-[10px] italic h-5 cursor-pointer text-gray-400" onClick={handleSync}>
                    Sync Database
                </Button> */}
                <Button variant={"ghost"} className={cn("text-[10px] italic h-5 cursor-pointer text-gray-400", { "bg-primary/50 border border-accent": selectedTab === Tabs.SETTINGS })} onClick={handleSettings}>
                    Settings <Settings className="ml-1 w-3 h-3" />
                </Button>
            </SidebarFooter>
        </Sidebar>
    )
}