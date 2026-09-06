import DashboardShell from "./DashboardShell";
import { DashboardProvider } from "./provider/Provider";

export default function Dashboard() {
    return (
        <DashboardProvider>
            <div className="flex h-full w-full min-w-0 flex-col bg-background text-foreground">
                <DashboardShell />
            </div>
        </DashboardProvider>
    )
}