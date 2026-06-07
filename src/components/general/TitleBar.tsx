import { api } from "@/api";
import { Button } from "../ui/button";
import { BotMessageSquare, Minus, Square, X } from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/store/ui";
import { cn } from "@/lib/utils";

const TitleBar = () => {
    const { aiAvailable, setAiAvailable } = useUiStore();
    const closeWindow = () => {
        const electronApi = window.api;
        electronApi.close();
    }

    const minimizeWindow = () => {
        const electronApi = window.api;
        electronApi.minimize();
    }

    const maximizeWindow = () => {
        const electronApi = window.api;
        electronApi.maximize();
    }

    const handleAICheck = async () => {
        const isMistralAvailable = await api.checkMistral();
        if (isMistralAvailable) {
            toast.success("Mistral is available ! Activating AI features...");
            setAiAvailable(true);
        } else {
            toast.error("Mistral is not available.", { description: "Make sure Ollama is installed and the Mistral model is downloaded." });
            setAiAvailable(false);
        }
    }

    return (
        <>
        <div className="w-full titlebar flex flex-row items-center justify-between p-1 bg-gray-800 text-white m-0 border-b-2 border-b-primary/20">
            <div className="w-full flex flex-row items-center">
                {/* logo (later) */}
                <span className="ml-2 text-lg font-bold">CvMaker</span>
                {/* buttons */}
            </div>
            <div className="flex flex-row gap-1">
                {/* close button/others */}
                <Button className="button bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={handleAICheck}>
                    <BotMessageSquare className={cn(aiAvailable ? "text-green-500": "")} />
                </Button>
                <Button className="button bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={minimizeWindow}>
                    <Minus />
                </Button>
                <Button className="button bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={maximizeWindow}>
                    <Square />
                </Button>
                <Button className="button bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={closeWindow}>
                    <X />
                </Button>
            </div>
        </div>
        {/* {
            showSubMenu === "File" && <Files x={subMenuPosition.x} y={subMenuPosition.y} />
        } */}
        </>
    )
}

export default TitleBar;