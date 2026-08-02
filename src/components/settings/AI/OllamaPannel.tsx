import { useEffect, useState } from "react";
import type { UserConfig } from "../../../../electron/services/config/UserConfig.interface";
import { Button } from "../../ui/button";
import { api } from "@/api";
import ManuallyInstallOllama from "./ManuallyInstallOllama";

// const ManuallyInstallOllama = ({back} : {back: () => void}) => {
//     const [ollamaPath, setOllamaPath] = useState<string>("http://127.0.0.1:11434");
//     const [ollamaDetected, setOllamaDetected] = useState<boolean | null>(null);
//     const [ollamaModels, setOllamaModels] = useState<string[]>([]);

//     const detectOllama = async () => {
//         const detected = await api.detectOllama(ollamaPath);
//         setOllamaDetected(detected);
//         console.log("Ollama detected:", detected);
//         if (!detected) toast.error("Ollama not detected. Please make sure Ollama is running and the URI is correct.");
//     }

//     const setOllamaModel = async (model: string) => {
//         console.log("Setting Ollama model:", model);
//     }

//     useEffect(() => {
//         const fetchOllamaModels = async () => {
//             const models = await api.getAvailableOllamaModels();
//             setOllamaModels(models);
//             setOllamaDetected(models.length > 0);
//         };
//         fetchOllamaModels();
//     }, [ollamaDetected]);

//     return <motion.div 
//         initial={{ opacity: 0, y: -10 }}
//         animate={{ opacity: 1, y: 0 }}
//         exit={{ opacity: 0, y: -10 }}
//     >
//         <div className="flex flex-col gap-2">
//             <Button variant={"ghost"} className="bg-gray-400 w-1/4" onClick={back}><ArrowLeft /> Back</Button>
//             <h2>Manually Install Ollama</h2>
//             <p>Please download Ollama from the official website and install it manually. Then start ollama.</p>
//             <InputGroup>
//                 <InputGroupText>Uri:</InputGroupText>
//                 <Input type="text" placeholder="Path to Ollama executable" value={ollamaPath} onChange={(e) => setOllamaPath(e.target.value)} />
//             </InputGroup>
//             <Button disabled={!ollamaPath || ollamaPath.trim() === "" || !ollamaPath.startsWith("http")} onClick={detectOllama} className={cn(ollamaDetected ? 'bg-green-500 hover:bg-green-600' : '')}>
//                 Detect Ollama
//             </Button>
//         </div>

//         {
//             ollamaModels.length > 0 && (
//                 <div className="mt-4">
//                     <h3 className="font-semibold">Available Ollama Models</h3>
//                     <ul className="list-disc list-inside">
//                         {ollamaModels.map((model) => (
//                             // each model is actually a button, when we click, the model will be selected as preferred model in the config, and the user will be able to use it in the AI features
//                             <li key={model} className="list-none">
//                                 <Button variant="secondary" className="border-b-2" onClick={() => setOllamaModel(model)}>
//                                     {model}
//                                 </Button>
//                             </li>
//                         ))}
//                     </ul>
//                 </div>
//             )
//         }
//     </motion.div>
// }

export default function OllamaPannel() {
    const [ollamaInfos, setOllamaInfos] = useState<NonNullable<UserConfig['ollama']> | null>(null);
    const [step, setStep] = useState<'initial' | 'manualInstall'>('initial');

    useEffect(() => {
        const fetchOllamaInfos = async () => {
            const infos = await api.getOllamaInfos();
            setOllamaInfos(infos);
            console.log("Ollama Infos:", infos);
        }
        fetchOllamaInfos();
    }, []);

    if (step === 'manualInstall') {
        return <ManuallyInstallOllama back={() => setStep('initial')} />;
    }

    return <>
        <div>
            <h2>Ollama</h2>
            <p className="text-gray-400 text-sm">Ollama is a local AI model provider that allows you to run AI models on your own machine without sending data to the cloud. It is free and open-source.</p>
            {
                ollamaInfos ? (
                    <div className="mt-4">
                        <h3 className="font-semibold">Ollama Information</h3>
                        <p className="text-gray-400 text-sm">Version: {ollamaInfos.installedViaOfficialInstaller ? 'Installed Manually' : 'Installed via cvMaker'}</p>
                    </div>
                ) : null
            }
            <div className="flex flex-col gap-2">
                <Button>Install Ollama</Button>
                <Button onClick={() => setStep('manualInstall')}>I prefer to install it manually</Button>
            </div>
        </div>
    </>
}