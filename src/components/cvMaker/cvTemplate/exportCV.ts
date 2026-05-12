import { api } from "@/api";
import { toast } from "sonner";

export const exportToPdf = async () => {
  const element = document.getElementById("cv-content");
  if (!element) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('');

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
      <title>CV</title>
        <meta charset="utf-8">
        ${styles}
        <style>
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          #cv-content { box-shadow: none !important; border: none !important; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `;

  const success = await api.generatePDF(fullHTML, "MonCV.pdf");
  if (success) toast.success("CV exported successfully!");
};