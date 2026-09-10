import { api } from "@/api";
import { toast } from "sonner";

/** Strip the characters that are not allowed in a file name. */
const sanitizeFileNamePart = (value: string) =>
  value.replace(/[/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();

const buildFileName = (companyName?: string, roleName?: string) => {
  const parts = ["Resume CV", companyName, roleName]
    .map((part) => (part ? sanitizeFileNamePart(part) : ""))
    .filter(Boolean);

  return `${parts.join(" - ")}.pdf`;
};

export const exportToPdf = async (companyName?: string, roleName?: string, applicationId?: string) => {
  const element = document.getElementById("cv-content");
  if (!element) return;

  // const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
  //   .map(s => s.outerHTML)
  //   .join('');
  
  const styleContent = Array.from(document.styleSheets)
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

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
      <title>CV</title>
        <meta charset="utf-8">
        <style>
          ${styleContent}
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          #cv-content { box-shadow: none !important; border: none !important; }
          .hidden-print { display: none !important; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `;

  const success = await api.generatePDF(fullHTML, buildFileName(companyName, roleName), applicationId);
  if (success) {
    const fileName = success.split(/[/\\]/).pop() || "PDF";
    toast.success("Cover letter exported successfully!", {
      description: `The cover letter has been exported to ${fileName}.`,
      action: {
        label: "Open folder",
        onClick: () => {
          const folderPath = success.substring(0, Math.max(success.lastIndexOf("/"), success.lastIndexOf("\\")));
          api.openFolder(folderPath);
        }
      }
    });
  }
  else toast.error("Cover letter export cancelled or failed.");
};