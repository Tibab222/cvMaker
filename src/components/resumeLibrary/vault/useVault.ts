import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { readPdfResume } from "@/lib/pdf";
import { useProfileStore } from "@/store/profile";
import type { VaultResume } from "@shared/vault.types";
import { errorMessage } from "../../opportunities/useDiscovery";

export interface ImportProgress {
  id: string;
  fileName: string;
  step: "reading" | "saving";
}

/** The resume vault of the open profile: list, import (read here, stored by the app), rename, remove. */
export function useVault() {
  const [resumes, setResumes] = useState<VaultResume[] | null>(null);
  const [importing, setImporting] = useState<ImportProgress[]>([]);
  const profileId = useProfileStore((state) => state.id);

  useEffect(() => {
    api.vault.list().then(setResumes).catch((error) => {
      toast.error(`Could not load the vault: ${errorMessage(error)}`);
      setResumes([]);
    });
  }, [profileId]);

  /** Files are read one after the other: pdf.js and the keyword model both like to run alone. */
  const importFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter((file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name));
    if (pdfs.length < files.length) toast.warning("Only PDF files can go in the vault.");
    const queue = pdfs.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, fileName: file.name, step: "reading" as const }));
    setImporting((current) => [...current, ...queue]);

    let added = 0;
    for (const [index, file] of pdfs.entries()) {
      const { id } = queue[index];
      try {
        const payload = await readPdfResume(file);
        setImporting((current) => current.map((item) => (item.id === id ? { ...item, step: "saving" } : item)));
        const result = await api.vault.import(payload);
        if (!result.ok) throw new Error(result.error);
        setResumes((current) => [result.resume, ...(current ?? [])]);
        added++;
        if (!result.resume.has_text) {
          toast.warning(`${result.resume.name}: no text found (scanned PDF?). It is stored, but cannot be matched to offers.`);
        }
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setImporting((current) => current.filter((item) => item.id !== id));
      }
    }
    if (added > 0) toast.success(added > 1 ? `${added} resumes added to your vault` : "Resume added to your vault");
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    try {
      const updated = await api.vault.rename(id, name);
      setResumes((current) => current?.map((resume) => (resume.id === id ? updated : resume)) ?? current);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await api.vault.remove(id);
      setResumes((current) => current?.filter((resume) => resume.id !== id) ?? current);
      toast.success("Resume removed from the vault");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const open = useCallback((id: string) => api.vault.open(id).catch((error) => toast.error(errorMessage(error))), []);
  const reveal = useCallback((id: string) => api.vault.reveal(id).catch((error) => toast.error(errorMessage(error))), []);

  return { resumes, importing, importFiles, rename, remove, open, reveal };
}

export type VaultState = ReturnType<typeof useVault>;
