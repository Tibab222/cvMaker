import { createContext } from "react";
import type { DashboardContextType } from "./Provider";

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);