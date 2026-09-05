import React, { useEffect, useState } from "react";
import { DashboardContext } from "./Context";
import type { KeywordStat } from "@shared/Keywords.types";
import { api } from "@/api";
import type { KeyStats } from "@shared/jobApplications.type";

export interface DashboardContextType {
  keywords: KeywordStat[];
  keyStats: KeyStats | null;
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keywords, setKeywords] = useState<KeywordStat[]>([]);
    const [keyStats, setKeyStats] = useState<KeyStats | null>(null);

    useEffect(() => {
      const fetchTopKeywords = async () => {
        try {
          const topKeywords = await api.getTopKeywords(10);
          setKeywords(topKeywords);
        } catch (error) {
          console.error("Error fetching top keywords:", error);
        }
      };

      const fetchKeyStats = async () => {
        try {
          const stats = await api.getKeyStats();
          setKeyStats(stats);
        }
        catch (error) {
          console.error("Error fetching key stats:", error);
        }
      };

      fetchKeyStats();
      fetchTopKeywords();
    }, []);

  return (
    <DashboardContext.Provider
      value={{
        keywords,
        keyStats,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
