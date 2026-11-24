/** A .cvm file found in the user templates folder (parsed and validated by the renderer). */
export interface UserTemplateFile {
    fileName: string;
    source: string;
}

export interface TemplateImportResult {
    canceled: boolean;
    imported: { id: string; name: string; replaced: boolean }[];
    errors: { file: string; error: string }[];
}
