import React, { useEffect, useState } from "react";
import { DashboardContext } from "./Context";
import type { KeywordStat } from "@shared/Keywords.types";
import { api } from "@/api";

export interface DashboardContextType {
  keywords: KeywordStat[];
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keywords, setKeywords] = useState<KeywordStat[]>([]);

    useEffect(() => {
      const fetchTopKeywords = async () => {
        try {
          const topKeywords = await api.getTopKeywords(10);
          setKeywords(topKeywords);
        } catch (error) {
          console.error("Error fetching top keywords:", error);
        }
      };
      fetchTopKeywords();
    }, []);

  return (
    <DashboardContext.Provider
      value={{
        keywords,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
