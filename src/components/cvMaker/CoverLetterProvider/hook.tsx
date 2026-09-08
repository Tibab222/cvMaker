import React from "react";
import { CoverLetterContext } from "./Context";

export default function useCoverLetterContext() {
    const context = React.useContext(CoverLetterContext);
    if (!context) {
        throw new Error("useCoverLetterContext must be used within a CoverLetterProvider");
    }
    return context;
}