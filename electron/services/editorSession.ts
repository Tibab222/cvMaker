/** The application whose tailored resume the editor has loaded, as the window reports it; null when none. */
let openApplicationId: string | null = null;

export const setEditorSession = (applicationId: unknown) => {
    openApplicationId = typeof applicationId === "string" && applicationId ? applicationId : null;
};

export const editorSession = () => openApplicationId;
