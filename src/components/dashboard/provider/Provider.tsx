import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardContext } from "./Context";
import type { KeywordStat } from "@shared/Keywords.types";
import { api } from "@/api";
import {
  JobApplicationStatus,
  type Application,
  type ApplicationDetailsDto,
  type ApplicationEditDto,
  type ApplicationWithEvents,
  type KeyStats,
  type NewApplicationEventDto,
  type PastApplicationDto,
  type PastApplicationResult,
  type Reminder,
  type SilentApplication,
} from "@shared/jobApplications.type";

export interface DashboardContextType {
  keywords: KeywordStat[];
  keyStats: KeyStats | null;
  applications: Application[];
  reminders: Reminder[];
  /** Applications marked Applied without any sign of life for NO_RESPONSE_AFTER_DAYS or more, longest silence first. */
  silentApplications: SilentApplication[];
  /** The one thing to show on each application's card: an interview, a follow-up due, a long silence, a stale draft. */
  attentionByApp: Map<string, Reminder>;
  /** Closes applications as No response (only the ones still Applied), with an undo in the toast. */
  markNoResponse: (ids: string[]) => Promise<number>;
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
  /** Adds an application sent outside the app; validation errors come back in the result. */
  addPastApplication: (dto: PastApplicationDto) => Promise<PastApplicationResult>;
  /** Corrects an application (company, position, link…); validation errors come back in the result. */
  editApplication: (id: string, dto: ApplicationEditDto) => Promise<PastApplicationResult>;
  /** Bumped after every change, so views showing derived data (the drawer timeline) know when to reload. */
  revision: number;
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [keyStats, setKeyStats] = useState<KeyStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [silentApplications, setSilentApplications] = useState<SilentApplication[]>([]);
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
    try {
      setSilentApplications(await api.getSilentApplications());
    } catch (error) {
      console.error("Error fetching silent applications:", error);
    }
  }, []);

  const attentionByApp = useMemo(() => {
    const map = new Map<string, Reminder>();
    // reminders arrive sorted by priority: keep the most important one per application
    for (const reminder of reminders) if (!map.has(reminder.application_id)) map.set(reminder.application_id, reminder);
    for (const app of silentApplications) {
      if (map.has(app.id)) continue;
      map.set(app.id, { id: `no_response_${app.id}`, kind: "no_response", application_id: app.id, job_title: app.job_title, company_name: app.company_name, date: app.last_sign, days: app.days });
    }
    return map;
  }, [reminders, silentApplications]);

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

  // the browser extension or Claude changed applications while the dashboard is open: refresh quietly and say so
  useEffect(() => {
    return api.onApplicationsChanged(async (event) => {
      try {
        setApplications(await api.getApplications());
        refreshDerived();
      } catch (error) {
        console.error("Error refreshing applications:", error);
      }
      const linked = event.fromOffer ? ", linked to its offer in Opportunities" : "";
      const from = event.source === "claude" ? "by Claude" : "from your browser";
      if (event.action === "created") toast.success(`${event.title} at ${event.company} added ${from}${linked}`);
      else if (event.action === "updated") toast.success(`${event.title} at ${event.company} updated ${from}`);
      else if (event.action === "promoted") toast.success(`${event.title} at ${event.company} moved to Applied`);
    });
  }, [refreshDerived]);

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

  const markNoResponse = useCallback(async (ids: string[]): Promise<number> => {
    try {
      const closed = await api.markNoResponse(ids);
      setApplications(await api.getApplications());
      refreshDerived();
      if (closed.length === 0) {
        toast.info("Nothing to close: they are no longer waiting");
        return 0;
      }
      toast.success(closed.length === 1 ? "Closed as No response" : `${closed.length} applications closed as No response`, {
        description: "They moved to Closed. If a company answers later, move its card back.",
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              try {
                await api.undoNoResponse(closed);
                setApplications(await api.getApplications());
                refreshDerived();
              } catch (error) {
                console.error("Failed to undo:", error);
                toast.error("Could not undo");
              }
            })();
          },
        },
      });
      return closed.length;
    } catch (error) {
      console.error("Failed to close applications:", error);
      toast.error("Could not close these applications");
      return 0;
    }
  }, [refreshDerived]);

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

  const addPastApplication = useCallback(async (dto: PastApplicationDto): Promise<PastApplicationResult> => {
    try {
      const result = await api.addPastApplication(dto);
      if (result.ok) {
        setApplications((prev) => [result.application, ...prev]);
        refreshDerived();
      }
      return result;
    } catch (error) {
      console.error("Failed to add application:", error);
      return { ok: false, error: "Could not save this application" };
    }
  }, [refreshDerived]);

  const editApplication = useCallback(async (id: string, dto: ApplicationEditDto): Promise<PastApplicationResult> => {
    try {
      const result = await api.editApplication(id, dto);
      if (result.ok) {
        setApplications((prev) => prev.map((app) => (app.id === id ? result.application : app)));
        refreshDerived();
      }
      return result;
    } catch (error) {
      console.error("Failed to edit application:", error);
      return { ok: false, error: "Could not save your changes" };
    }
  }, [refreshDerived]);

  return (
    <DashboardContext.Provider
      value={{
        keywords,
        keyStats,
        applications,
        reminders,
        silentApplications,
        attentionByApp,
        markNoResponse,
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
        addPastApplication,
        editApplication,
        revision,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
