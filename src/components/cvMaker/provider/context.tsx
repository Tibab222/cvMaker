import { createContext } from "react";
import type { CVSelectionContextType } from "./provider";

export const CVSelectionContext = createContext<CVSelectionContextType | undefined>(undefined);