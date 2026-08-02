export type SetupProgressType = 'binary_download' | 'model_pull';

export interface SetupProgressStatus {
    type: SetupProgressType;
    percent: number;
    completedBytes: number;
    totalBytes: number;
    statusText?: string;
}

export type OnProgressCallback = (status: SetupProgressStatus) => void;