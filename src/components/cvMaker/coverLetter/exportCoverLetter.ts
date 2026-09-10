import { api } from "@/api";
import { toast } from "sonner";

const COVER_LETTER_ELEMENT_ID = "cover-letter-content";

/**
 * Collect every rule of the currently applied stylesheets so the offscreen
 * print window renders with the same Tailwind / CSS output as the preview.
 */
const collectDocumentStyles = () =>
  Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join("");
      } catch (e) {
        console.warn("Could not read stylesheet rules", e);
        return "";
      }
    })
    .join("\n");

/** Strip the characters that are not allowed in a file name. */
const sanitizeFileNamePart = (value: string) =>
  value.replace(/[\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();

const buildFileName = (companyName?: string, roleName?: string) => {
  const parts = ["Cover Letter", companyName, roleName]
    .map((part) => (part ? sanitizeFileNamePart(part) : ""))
    .filter(Boolean);

  return `${parts.join(" - ")}.pdf`;
};

export const exportCoverLetterToPdf = async (companyName?: string, roleName?: string) => {
  const element = document.getElementById(COVER_LETTER_ELEMENT_ID);
  if (!element) {
    toast.error("Cover letter not found, open it before exporting.");
    return false;
  }

  const styleContent = collectDocumentStyles();

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cover Letter</title>
        <meta charset="utf-8">
        <style>
          ${styleContent}
          body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #${COVER_LETTER_ELEMENT_ID} { box-shadow: none !important; border: none !important; margin: 0 auto !important; }
          .hidden-print { display: none !important; }

          @media print {
            /* the global print rules only reveal #cv-content, opt the cover letter in */
            body * { visibility: hidden; }
            #${COVER_LETTER_ELEMENT_ID}, #${COVER_LETTER_ELEMENT_ID} * { visibility: visible !important; }
            #${COVER_LETTER_ELEMENT_ID} {
              width: 100% !important;
              min-height: 0 !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            .hidden-print { display: none !important; }

            @page {
              size: A4;
              margin: 15mm !important;
            }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `;

  try {
    const success = await api.generatePDF(fullHTML, buildFileName(companyName, roleName));
    // the IPC handler also returns false when the save dialog is dismissed
    if (success) toast.success("Cover letter exported successfully!");
    else toast.error("Cover letter export cancelled or failed.");
    return success;
  } catch (e: unknown) {
    console.error("Error exporting cover letter:", e);
    toast.error("Cover letter export failed.");
    return false;
  }
};
