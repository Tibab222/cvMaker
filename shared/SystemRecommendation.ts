export interface SystemHardwareConfig {
    os: string;
    arch: string;
    cpuModel: string;
    ramTotalGB: number;
    hasDedicatedGPU: boolean; 
    gpuModel: string;
}

export interface SystemRecommendations {
    ollamaFriendly: boolean;
    recommendedModel: string;
    systemHardware?: SystemHardwareConfig;
}