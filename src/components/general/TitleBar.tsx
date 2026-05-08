import { Button } from "../ui/button";
import { Minus, Square, X } from "lucide-react";

const TitleBar = () => {
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

    return (
        <>
        <div className="w-full titlebar flex flex-row items-center justify-between p-1 bg-gray-800 text-white m-0">
            <div className="w-full flex flex-row items-center">
                {/* logo (later) */}
                <span className="ml-2 text-lg font-bold">CvMaker</span>
                {/* buttons */}
            </div>
            <div className="flex flex-row gap-1">
                {/* close button/others */}
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