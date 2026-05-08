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
import { BicepsFlexed, BookCheck, File, Landmark, PersonStanding, Plus } from "lucide-react";
import { useState, useEffect } from "react";

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
    const { setSelectedTab } = useUiStore();
    const { profile } = useProfileStore();

    useEffect(() => {
        const setRandom = () => setQuote(FUNNY_QUOTES[Math.floor(Math.random() * FUNNY_QUOTES.length)]);
        setRandom();
        const id = setInterval(() => {
            setRandom();
        }, 600000);
        return () => clearInterval(id);
    }, []);

    return (
        <Sidebar side="left" {...props}>
            <SidebarHeader>
                <h1 className="text-2xl font-bold text-gray-700">CV Maker</h1>
                <h3>{profile?.firstName || "tot"} {profile?.lastName}</h3>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Edit your profile</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.PERSONAL)}>
                                <SidebarMenuButton>Personal Information</SidebarMenuButton>
                                <SidebarMenuBadge><PersonStanding className="text-gray-500" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.EDUCATION)}>
                                <SidebarMenuButton>Education</SidebarMenuButton>
                                <SidebarMenuBadge><BookCheck className="text-gray-500" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.EXPERIENCE)}>
                                <SidebarMenuButton>Experience</SidebarMenuButton>
                                <SidebarMenuBadge><Landmark className="text-gray-500" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.PROJECTS)}>
                                <SidebarMenuButton>Projects</SidebarMenuButton>
                                <SidebarMenuBadge><File className="text-gray-500" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.SKILLS)}>
                                <SidebarMenuButton>Skills</SidebarMenuButton>
                                <SidebarMenuBadge><BicepsFlexed className="text-gray-500" /></SidebarMenuBadge>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Write your CV</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem onClick={() => setSelectedTab(Tabs.CVMAKER)}>
                                <SidebarMenuButton >Create your CV</SidebarMenuButton>
                                <SidebarMenuBadge><Plus className="text-gray-500" /></SidebarMenuBadge>
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
            </SidebarFooter>
        </Sidebar>
    )
}