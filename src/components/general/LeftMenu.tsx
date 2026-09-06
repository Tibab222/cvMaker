import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs } from "@/store/ui";
import type { Profile } from "@shared/profile.interface";
import { IconLayoutBoard } from "@tabler/icons-react";

interface LeftMenuProps {
  selectedTab: Tabs;
  onSelectTab: (tab: Tabs) => void;
  profile?: Profile;
  onLogout?: () => void;
}

interface MenuItem {
  label: string;
  value: Tabs;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}

const PROFILE_ITEMS: MenuItem[] = [
  { label: "Personal information", value: Tabs.PERSONAL, icon: UserRound },
  { label: "Education", value: Tabs.EDUCATION, icon: BookOpenCheck },
  { label: "Experience", value: Tabs.EXPERIENCE, icon: BriefcaseBusiness },
  { label: "Projects", value: Tabs.PROJECTS, icon: FolderKanban },
  { label: "Skills", value: Tabs.SKILLS, icon: Sparkles },
];

const QUOTES = [
  {
    quote: "Simplicity is the ultimate sophistication.",
    writer: "Leonardo da Vinci",
  },
  {
    quote: "Make it simple, but significant.",
    writer: "Don Draper",
  },
  {
    quote: "Quality is not an act, it is a habit.",
    writer: "Aristotle",
  },
  {
    quote: "Details make perfection, and perfection is not a detail.",
    writer: "Leonardo da Vinci",
  },
  {
    quote: "Opportunity does not knock, it presents itself when you beat down the door.",
    writer: "Kyle Chandler",
  },
  {
    quote: "It always seems impossible until it's done.",
    writer: "Nelson Mandela",
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    writer: "Winston Churchill",
  },
  {
    quote: "I never dreamed about success. I worked for it.",
    writer: "Estée Lauder",
  },
  {
    quote: "The future depends on what you do today.",
    writer: "Mahatma Gandhi",
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    writer: "Sam Levenson",
  },
  {
    quote: "Opportunities don't happen. You create them.",
    writer: "Chris Grosser",
  },
  {
    quote: "Hard work beats talent when talent doesn't work hard.",
    writer: "Tim Notke",
  },
];

function MenuEntry({ item, selectedTab, onSelectTab }: {
  item: MenuItem;
  selectedTab: Tabs;
  onSelectTab: (tab: Tabs) => void;
}) {
  const Icon = item.icon;
  const active = selectedTab === item.value;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        isActive={active}
        tooltip={item.label}
        onClick={() => onSelectTab(item.value)}
        className="relative h-11 rounded-md px-3 text-sidebar-foreground/70 transition-colors duration-200 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-2.5"
      >
        {active && (
          <motion.span
            layoutId="active-menu-item"
            className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-sidebar-primary-foreground group-data-[collapsible=icon]:hidden"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <Icon className="size-4.5 group-data-[collapsible=icon]:mx-auto" />
        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
      </SidebarMenuButton>
      {item.badge && (
        <SidebarMenuBadge className="bg-sidebar-accent text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
          {item.badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

export default function LeftMenu({ selectedTab, onSelectTab, profile, onLogout }: LeftMenuProps) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    const setRandomQuote = () => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setRandomQuote();
    const interval = window.setInterval(setRandomQuote, 600_000);
    return () => window.clearInterval(interval);
  }, []);

  const firstName = profile?.firstName || "Alex";
  const lastName = profile?.lastName || "Morgan";
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 border-b border-sidebar-border p-3">
        <div className="flex h-11 items-center gap-3 overflow-hidden">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {initials}
          </motion.div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {firstName} {lastName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/55">Curriculum workspace</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="size-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase text-sidebar-foreground/45">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  isActive={selectedTab === Tabs.DASHBOARD}
                  tooltip="Dashboard"
                  onClick={() => onSelectTab(Tabs.DASHBOARD)}
                  className="h-11 relative z-100 rounded-md px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-2.5"
                >
                  <IconLayoutBoard className="size-4.5 group-data-[collapsible=icon]:mx-auto" />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase text-sidebar-foreground/45">
            Your profile
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {PROFILE_ITEMS.map((item, index) => (
                <motion.div
                  key={item.value}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.25 }}
                >
                  <MenuEntry item={item} selectedTab={selectedTab} onSelectTab={onSelectTab} />
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase text-sidebar-foreground/45">
            Your document
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  isActive={selectedTab === Tabs.CVMAKER}
                  tooltip="Create your CV"
                  onClick={() => onSelectTab(Tabs.CVMAKER)}
                  className="h-11 rounded-md px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-2.5"
                >
                  <FileText className="size-4.5 group-data-[collapsible=icon]:mx-auto" />
                  <span className="group-data-[collapsible=icon]:hidden">Create your CV</span>
                  <WandSparkles className="ml-auto size-3.5 opacity-60 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <motion.blockquote
          key={quote.quote}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 border-l-2 border-sidebar-primary/25 px-3 py-1 text-xs leading-relaxed text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden"
        >
          “{quote.quote}” - <span className="font-semibold text-sidebar-foreground/75">{quote.writer}</span>
        </motion.blockquote>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              isActive={selectedTab === Tabs.SETTINGS}
              onClick={() => onSelectTab(Tabs.SETTINGS)}
              className="h-9 text-sidebar-foreground/65 group-data-[collapsible=icon]:mx-auto"
            >
              <Settings />
              <span className="group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={onLogout}
              className="h-9 text-sidebar-foreground/65 hover:text-destructive group-data-[collapsible=icon]:mx-auto"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="mx-auto mt-1 size-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}