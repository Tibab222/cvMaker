import React, { useCallback, useEffect, useState } from "react";
import { DashboardContext } from "./Context";
import type { KeywordStat } from "@shared/Keywords.types";
import { api } from "@/api";
import type { Application, ApplicationWithEvents, JobApplicationStatus, KeyStats } from "@shared/jobApplications.type";

export interface DashboardContextType {
  keywords: KeywordStat[];
  keyStats: KeyStats | null;
  applications: Application[];
  isLoading: boolean;
  updateApplicationStatus: (id: string, newStatus: JobApplicationStatus) => Promise<void>;
  refetchApplications: () => Promise<void>;
  getApplicationInfos: (applicationId: string) => Promise<ApplicationWithEvents | null>;
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keywords, setKeywords] = useState<KeywordStat[]>([]);
    const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchApplications = useCallback(async () => {
      try {
        setIsLoading(true);
        const data = await api.getApplications(); // TODO
        setApplications(data);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
      }
    }, []);

    const fetchKeyStats = async () => {
      try {
        const stats = await api.getKeyStats();
        setKeyStats(stats);
      }
      catch (error) {
        console.error("Error fetching key stats:", error);
      }
    };

    useEffect(() => {
      const fetchTopKeywords = async () => {
        try {
          const topKeywords = await api.getTopKeywords(10);
          setKeywords(topKeywords);
        } catch (error) {
          console.error("Error fetching top keywords:", error);
        }
      };
      
      const timeoutId = window.setTimeout(() => {
        fetchKeyStats();
        fetchTopKeywords();
        fetchApplications();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }, [fetchApplications]);

    const updateApplicationStatus = async (id: string, newStatus: JobApplicationStatus) => {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );

      try {
        await api.updateApplicationStatus(id, newStatus); // TODO
        fetchKeyStats();
      } catch (error) {
        console.error("Failed to update status on server:", error);
        fetchApplications();
      }
    };

    const getApplicationInfos = async (applicationId: string): Promise<ApplicationWithEvents | null> => {
      try {
        const applicationInfos = await api.getApplicationWithTimeline(applicationId);
        return applicationInfos;
      } catch (error) {
        console.error("Error fetching application infos:", error);
        return null;
      }
    };

    return (
      <DashboardContext.Provider
        value={{
          keywords,
          keyStats,
          applications,
          isLoading,
          updateApplicationStatus,
          refetchApplications: fetchApplications,
          getApplicationInfos
        }}
      >
        {children}
      </DashboardContext.Provider>
    );
};
