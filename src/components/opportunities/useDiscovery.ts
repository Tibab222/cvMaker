import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { Tabs, useUiStore } from "@/store/ui";
import { useProfileStore } from "@/store/profile";
import {
  DiscoveredJobStatus,
  type AdzunaQuery,
  type AdzunaStatus,
  type DiscoveredJob,
  type DiscoveryRunStatus,
  type DiscoverySettings,
  type JobSource,
  type ProfileFilterSuggestion,
} from "@shared/discovery.types";

/** IPC errors arrive as "Error invoking remote method 'x': Error: <message>": keep the message. */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, "");
}

/** Everything the Opportunities page needs, kept in sync with the background search through IPC events. */
export function useDiscovery() {
  const [jobs, setJobs] = useState<DiscoveredJob[] | null>(null);
  const [sources, setSources] = useState<JobSource[]>([]);
  const [settings, setSettings] = useState<DiscoverySettings | null>(null);
  const [status, setStatus] = useState<DiscoveryRunStatus | null>(null);

  const refreshJobs = useCallback(async () => {
    try {
      setJobs(await api.discovery.listJobs());
    } catch (error) {
      toast.error(`Could not load the queue: ${errorMessage(error)}`);
      setJobs([]);
    }
  }, []);

  const refreshSources = useCallback(async () => {
    setSources(await api.discovery.listSources());
  }, []);

  const [adzuna, setAdzuna] = useState<AdzunaStatus | null>(null);
  const [suggestion, setSuggestion] = useState<ProfileFilterSuggestion | null>(null);
  /** The profile may have changed since the page opened (a new experience): read it again when the setup opens. */
  const refreshSuggestion = useCallback(async () => {
    setSuggestion(await api.discovery.suggestFilters().catch(() => null));
  }, []);

  const wasRunning = useRef(false);
  // the queue, sources and settings live in the profile database: read them again when the profile changes
  const profileId = useProfileStore((state) => state.id);

  useEffect(() => {
    api.discovery.listJobs().then(setJobs).catch((error) => {
      toast.error(`Could not load the queue: ${errorMessage(error)}`);
      setJobs([]);
    });
    api.discovery.listSources().then(setSources).catch(() => undefined);
    api.discovery.getSettings().then(setSettings).catch(() => undefined);
    api.discovery.suggestFilters().then(setSuggestion).catch(() => setSuggestion(null));
    api.discovery.adzunaStatus().then(setAdzuna).catch(() => setAdzuna({ connected: false, appId: null }));
    api.discovery.getStatus().then((current) => {
      wasRunning.current = current.running;
      setStatus(current);
    }).catch(() => undefined);

    const offStatus = api.discovery.onStatus((next) => {
      // a run just ended: sources carry their new last_run / error, and say how it went
      if (wasRunning.current && !next.running) {
        void refreshSources();
        if (next.cancelled) toast.info(next.added > 0 ? `Search stopped · ${next.added} new in your queue` : "Search stopped");
        else if (next.added > 0) toast.success(`${next.added} new ${next.added > 1 ? "offers" : "offer"} in your queue`);
        else if (next.errors.length === 0) toast.info("No new offer matching your filters");
      }
      wasRunning.current = next.running;
      setStatus(next);
    });
    const offJobs = api.discovery.onJobsChanged(() => void refreshJobs());
    return () => {
      offStatus();
      offJobs();
    };
  }, [profileId, refreshJobs, refreshSources]);

  const setJobStatus = useCallback(async (id: number, next: DiscoveredJobStatus) => {
    // optimistic: the card moves at once, the list is re-read if the write fails
    setJobs((current) => current?.map((job) => (job.id === id ? { ...job, status: next } : job)) ?? current);
    try {
      await api.discovery.setJobStatus(id, next);
    } catch (error) {
      toast.error(errorMessage(error));
      void refreshJobs();
    }
  }, [refreshJobs]);

  const prepareJob = useCallback(async (id: number) => {
    try {
      const payload = await api.discovery.prepareJob(id);
      if (!payload) return;
      const ui = useUiStore.getState();
      ui.setIncomingJob({ ...payload, id: `discovery-${id}-${Date.now()}` });
      ui.setSelectedTab(Tabs.CVMAKER);
      toast.success(`Opening ${payload.title} in the editor`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  /** The user opened the offer's link: a new one moves to the shortlist, and the extension links what they send. */
  const markOpened = useCallback(async (id: number) => {
    try {
      const kept = await api.discovery.markOpened(id);
      if (kept) {
        setJobs((current) => current?.map((job) => (job.id === id ? { ...job, status: DiscoveredJobStatus.SHORTLISTED } : job)) ?? current);
        toast.success("Kept in your shortlist", { description: "Apply in your browser: the extension links the application to this offer and moves it to Applied." });
      }
    } catch (error) {
      // only a convenience: the link still opens
      console.warn("Could not mark the offer as opened", error);
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus(await api.discovery.start());
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const cancel = useCallback(() => void api.discovery.cancel(), []);

  /** Throws the readable reason when the company cannot be followed (shown next to the field). */
  const addSource = useCallback(async (input: string) => {
    const result = await api.discovery.addSource(input);
    if (!result.ok) throw new Error(result.error);
    await refreshSources();
    return result.source;
  }, [refreshSources]);

  /** Keyword search on Adzuna. Throws the readable reason when it cannot be added. */
  const addSearch = useCallback(async (query: AdzunaQuery) => {
    const result = await api.discovery.addSearch(query);
    if (!result.ok) throw new Error(result.error);
    await refreshSources();
    return result.source;
  }, [refreshSources]);

  /** Checks the key with Adzuna before keeping it. Throws the readable reason when it is refused. */
  const connectAdzuna = useCallback(async (appId: string, appKey: string) => {
    const result = await api.discovery.connectAdzuna(appId, appKey);
    if (!result.ok) throw new Error(result.error);
    setAdzuna(result.status);
  }, []);

  const disconnectAdzuna = useCallback(async () => {
    setAdzuna(await api.discovery.disconnectAdzuna());
  }, []);

  const removeSource = useCallback(async (id: number) => {
    setSources((current) => current.filter((source) => source.id !== id));
    await api.discovery.removeSource(id);
  }, []);

  const toggleSource = useCallback(async (id: number, enabled: boolean) => {
    setSources((current) => current.map((source) => (source.id === id ? { ...source, enabled } : source)));
    await api.discovery.setSourceEnabled(id, enabled);
  }, []);

  const saveSettings = useCallback(async (next: DiscoverySettings) => {
    const saved = await api.discovery.saveSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  return {
    jobs,
    sources,
    settings,
    status,
    suggestion,
    refreshSuggestion,
    adzuna,
    addSearch,
    connectAdzuna,
    disconnectAdzuna,
    setJobStatus,
    prepareJob,
    markOpened,
    start,
    cancel,
    addSource,
    removeSource,
    toggleSource,
    saveSettings,
  };
}

export type DiscoveryState = ReturnType<typeof useDiscovery>;
