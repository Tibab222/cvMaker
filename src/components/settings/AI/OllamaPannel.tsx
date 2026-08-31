import { useEffect, useState } from "react";
import type { UserConfig } from "../../../../electron/services/config/UserConfig.interface";
import { Button } from "../../ui/button";
import { api } from "@/api";
import ManuallyInstallOllama from "./ManuallyInstallOllama";
import InstallOllama from "./InstallOllama";

export default function OllamaPannel() {
    const [ollamaInfos, setOllamaInfos] = useState<NonNullable<UserConfig['ollama']> | null>(null);
    const [step, setStep] = useState<'initial' | 'manualInstall' | 'install'>('initial');

    useEffect(() => {
        const fetchOllamaInfos = async () => {
            const infos = await api.getOllamaInfos();
            setOllamaInfos(infos);
        }
        fetchOllamaInfos();
    }, []);

    if (step === 'manualInstall') {
        return <ManuallyInstallOllama back={() => setStep('initial')} />;
    } else if (step === 'install') {
        return <InstallOllama back={() => setStep('initial')} />;
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
                <Button onClick={() => setStep('install')}>Install Ollama</Button>
                <Button onClick={() => setStep('manualInstall')}>I prefer to install it manually</Button>
            </div>
        </div>
    </>
}