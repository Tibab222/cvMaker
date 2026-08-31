import { cn } from "@/lib/utils";
import { IconBrandGoogle, IconHorse } from "@tabler/icons-react";
import { useState } from "react";
import OllamaPannel from "./OllamaPannel";
import SetupGemini from "./Gemini";

export default function AITab() {
    const [selectedProvider, setSelectedProvider] = useState<'ollama' | 'gemini'>('ollama');
    return <>
        <div className="flex flex-row h-full">
            {/* left pannel for choosing a provider */}
            <div className="w-1/5 border-r border-gray-300 flex flex-col gap-2 p-4">
                <div>AI Settings</div>
                <div className="text-gray-400 text-sm">Choose a Provider</div>
                <div 
                    className={cn("cursor-pointer p-2 rounded border transition-all", selectedProvider === 'ollama' ? 'bg-primary text-white' : 'hover:bg-primary/50')}
                    onClick={() => setSelectedProvider('ollama')}
                >
                    <h2 className="flex items-center gap-2"><IconHorse />Ollama</h2>
                    <h3 className = "text-sm italic">Free <span className="not-italic">|</span>Local</h3>
                </div>
                <div 
                    className={cn("cursor-pointer p-2 rounded border transition-all", selectedProvider === 'gemini' ? 'bg-primary text-white' : 'hover:bg-primary/50')}
                    onClick={() => setSelectedProvider('gemini')}
                >
                    <h2 className="flex items-center gap-2"><IconBrandGoogle />Gemini</h2>
                    <h3 className = "text-sm italic">Free options <span className="not-italic">|</span>Cloud</h3>
                </div>
            </div>
            {/* main pannel for the provider setting */}
            <div className="w-4/5 p-4">
                {selectedProvider === 'ollama' && <OllamaPannel />}
                {selectedProvider === 'gemini' && <SetupGemini />}
            </div>
        </div>
    </>
}