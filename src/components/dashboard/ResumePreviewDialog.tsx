import { useEffect, useState } from "react";
import { FileX, Loader2 } from "lucide-react";
import { api } from "@/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  applicationId: string | null; // null keeps the dialog closed
  fileName?: string;
  onOpenChange: (open: boolean) => void;
}

export default function ResumePreviewDialog({ applicationId, fileName, onOpenChange }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      setIsLoading(true);
      setPdfUrl(null);
      try {
        const data = await api.getResumePdf(applicationId);
        if (cancelled || !data) return;
        objectUrl = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "application/pdf" }));
        setPdfUrl(objectUrl);
      } catch (error) {
        console.error("Error loading resume PDF:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId]);

  return (
    <Dialog open={!!applicationId} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col bg-surface text-foreground sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resume preview</DialogTitle>
          <DialogDescription className="truncate">{fileName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} title={fileName || "Resume preview"} className="min-h-0 w-full flex-1 rounded-md border border-border/70" />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <FileX className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">Resume file not found</p>
            <p className="mt-1 text-xs text-muted-foreground">It may have been moved or deleted. Export it again from the resume editor.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
