import { api } from "@/api";
import { useProfileStore } from "@/store/profile";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { FolderSync } from "lucide-react";

export default function SyncTab() {
    const { experience, projects, id } = useProfileStore();
    const handleSync = () => {
        if (!id) return;
        api.syncDb(id, experience, projects).then(() => {
            toast.success('Database synced successfully!');
        })
    }

    return (
        <div className="w-full h-full flex flex-col items-start justify-start p-4 bg-zinc-100 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Synchronize local Data</h2>
            <p>
                The application is saving your data locally. It means your experiences and projects are converted to a vector and saved on your computer.<br />
                This is how the application can choose the best experiences and projects to show you when you are editing your CV.
                <br />
                If you edit manually the JSON files or if you think there is a problem with your local data, you can synchronize it with this button.
            </p>
            <Button variant={"default"} className="mt-8 mx-auto p-4 hover:bg-primary/50 hover:text-black/70 transition-all" onClick={handleSync}>
                <FolderSync />Synchronize local data
            </Button>
        </div>
    )
}