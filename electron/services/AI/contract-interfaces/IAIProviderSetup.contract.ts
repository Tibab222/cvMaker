import { IAIManager } from "./IAIManager.contract";

export interface IAIProviderSetup<T extends IAIManager = IAIManager> {
    readonly providerName: string;
    
    /** Test if the service is accessible */
    detect(uriOrApiKey?: string): Promise<boolean>;
    
    /** Get the AI manager instance */
    getManager(): T;
}