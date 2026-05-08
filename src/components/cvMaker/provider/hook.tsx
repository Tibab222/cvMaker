import { useContext } from "react";
import { CVSelectionContext } from "./context";

export const useCVSelection = () => {
  const context = useContext(CVSelectionContext);
  if (!context) {
    throw new Error('useCVSelection must be used within a CVSelectionProvider');
  }
  return context;
};