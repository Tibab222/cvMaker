import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardContext } from "./Context";
import type { KeywordStat } from "@shared/Keywords.types";
import { api } from "@/api";
import {
  JobApplicationStatus,
  type Application,
  type ApplicationDetailsDto,
  type ApplicationWithEvents,
  type KeyStats,
  type NewApplicationEventDto,
  type Reminder,
} from "@shared/jobApplications.type";

export interface DashboardContextType {
  keywords: KeywordStat[];
  keyStats: KeyStats | null;
  applications: Application[];
  reminders: Reminder[];
  isLoading: boolean;
  /** Application shown in the side drawer, if any. */
  selectedApplicationId: string | null;
  openApplication: (id: string | null) => void;
  updateApplicationStatus: (id: string, newStatus: JobApplicationStatus) => Promise<void>;
  refetchApplications: () => Promise<void>;
  getApplicationInfos: (applicationId: string) => Promise<ApplicationWithEvents | null>;
  deleteApplication: (id: string) => Promise<boolean>;
  addEvent: (applicationId: string, dto: NewApplicationEventDto) => Promise<boolean>;
  deleteEvent: (eventId: number) => Promise<boolean>;
  updateDetails: (applicationId: string, details: ApplicationDetailsDto) => Promise<boolean>;
  /** Bumped after every change, so views showing derived data (the drawer timeline) know when to reload. */
  revision: number;
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setApplications(await api.getApplications());
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Could not load your applications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchKeyStats = useCallback(async () => {
    try {
      setKeyStats(await api.getKeyStats());
    } catch (error) {
      console.error("Error fetching key stats:", error);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      setReminders(await api.getReminders(8));
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  }, []);

  /** Everything derived from the applications: stats, reminders and the drawer. */
  const refreshDerived = useCallback(() => {
    void fetchKeyStats();
    void fetchReminders();
    setRevision((r) => r + 1);
  }, [fetchKeyStats, fetchReminders]);

  useEffect(() => {
    const fetchTopKeywords = async () => {
      try {
        setKeywords(await api.getTopKeywords(10));
      } catch (error) {
        console.error("Error fetching top keywords:", error);
      }
    };

    // deferred so the first paint (and the page transition) is not blocked by IPC round trips
    const timeoutId = window.setTimeout(() => {
      void fetchKeyStats();
      void fetchReminders();
      void fetchTopKeywords();
      void fetchApplications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchApplications, fetchKeyStats, fetchReminders]);

  const updateApplicationStatus = useCallback(async (id: string, newStatus: JobApplicationStatus) => {
    const previous = applications;
    // optimistic move; the real applied_at comes back with the refetch
    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app)));

    try {
      await api.updateApplicationStatus(id, newStatus);
      setApplications(await api.getApplications());
      refreshDerived();
    } catch (error) {
      console.error("Failed to update status:", error);
      setApplications(previous);
      toast.error("Could not move the application");
    }
  }, [applications, refreshDerived]);

  const getApplicationInfos = useCallback(async (applicationId: string): Promise<ApplicationWithEvents | null> => {
    try {
      return await api.getApplicationWithTimeline(applicationId);
    } catch (error) {
      console.error("Error fetching application infos:", error);
      return null;
    }
  }, []);

  const deleteApplication = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await api.deleteApplication(id);
      if (success) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
        setSelectedApplicationId((current) => (current === id ? null : current));
        refreshDerived();
        toast.success("Application deleted");
      }
      return success;
    } catch (error) {
      console.error("Failed to delete application:", error);
      toast.error("Could not delete the application");
      return false;
    }
  }, [refreshDerived]);

  const addEvent = useCallback(async (applicationId: string, dto: NewApplicationEventDto): Promise<boolean> => {
    try {
      await api.addApplicationEvent(applicationId, dto);
      // scheduling an interview can move the card, so the board is refreshed too
      setApplications(await api.getApplications());
      refreshDerived();
      return true;
    } catch (error) {
      console.error("Failed to add event:", error);
      toast.error((error as Error).message?.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") || "Could not save this entry");
      return false;
    }
  }, [refreshDerived]);

  const deleteEvent = useCallback(async (eventId: number): Promise<boolean> => {
    try {
      const success = await api.deleteApplicationEvent(eventId);
      if (success) refreshDerived();
      return success;
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Could not delete this entry");
      return false;
    }
  }, [refreshDerived]);

  const updateDetails = useCallback(async (applicationId: string, details: ApplicationDetailsDto): Promise<boolean> => {
    try {
      const success = await api.updateApplicationDetails(applicationId, details);
      if (success) {
        setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, ...details } : app)));
        setRevision((r) => r + 1);
      }
      return success;
    } catch (error) {
      console.error("Failed to update details:", error);
      toast.error("Could not save your notes");
      return false;
    }
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        keywords,
        keyStats,
        applications,
        reminders,
        isLoading,
        selectedApplicationId,
        openApplication: setSelectedApplicationId,
        updateApplicationStatus,
        refetchApplications: fetchApplications,
        getApplicationInfos,
        deleteApplication,
        addEvent,
        deleteEvent,
        updateDetails,
        revision,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
