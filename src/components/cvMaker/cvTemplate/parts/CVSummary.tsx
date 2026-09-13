import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCVSelection } from "../../provider/hook";
import { i18n } from "../i18n";

// edit controls must never reach the PDF: hidden-print is stripped by exportToPdf, print:hidden covers window.print
const controlsClass = "hidden-print print:hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10";
const iconButtonClass = "flex items-center justify-center h-4 w-4 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent";

export default function CVSummary({ lang = 'en' }: { lang?: string }) {
  const { summaryBullets, setSummaryBullets, showSummary } = useCVSelection();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = i18n[lang as keyof typeof i18n];

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingIndex]);

  if (!showSummary) return null;

  const handleBulletChange = (index: number, newValue: string) => {
    const updated = [...summaryBullets];
    updated[index] = newValue;
    setSummaryBullets(updated);
  };

  const insertBullet = (index: number) => {
    const updated = [...summaryBullets];
    updated.splice(index, 0, "");
    setSummaryBullets(updated);
    setEditingIndex(index);
  };

  const moveBullet = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= summaryBullets.length) return;
    const updated = [...summaryBullets];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSummaryBullets(updated);
    setEditingIndex(null);
  };

  const deleteBullet = (index: number) => {
    setSummaryBullets(summaryBullets.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  // keep the textarea focused while a control is clicked, so the layout doesn't shift under the pointer
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const insertButton = (index: number, position: string) => (
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={() => insertBullet(index)}
      aria-label="Insert a bullet point here"
      title="Insert a bullet point here"
      className={`absolute left-1/2 -translate-x-1/2 ${position} flex items-center justify-center h-4 w-4 rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:text-slate-800 hover:border-slate-500 ${controlsClass}`}
    >
      <Plus className="h-3 w-3" />
    </button>
  );

  return (
    <section className="flex flex-col gap-1.5">
        <h2 className="text-[12px] font-semibold text-slate-800 uppercase tracking-wide">{t.resumeSummaryTitle}</h2>
      <ul className="list-disc list-outside ml-4 flex flex-col gap-1 text-[11px] text-slate-700 leading-snug">
        {summaryBullets.map((bullet, index) => (
          // an empty bullet is only a placeholder, so it's left out of the printed resume
          <li key={index} className={`group relative pl-0.5 ${bullet.trim() ? "" : "hidden-print print:hidden"}`}>
            {index === 0 && insertButton(0, "-top-2.5")}
            {editingIndex === index ? (
              <textarea
                ref={textareaRef}
                value={bullet}
                placeholder={t.summaryBulletPlaceholder}
                onChange={(e) => {
                  handleBulletChange(index, e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onBlur={() => setEditingIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    setEditingIndex(null);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none font-sans leading-snug"
                rows={1}
              />
            ) : (
              <span
                onClick={() => setEditingIndex(index)}
                className="cursor-pointer hover:bg-slate-100 rounded px-0.5 transition-colors block border border-transparent hover:border-slate-200"
                title="Click to edit"
              >
                {bullet || <span className="italic opacity-40">{t.summaryBulletPlaceholder}</span>}
              </span>
            )}
            <div className={`absolute -top-3 right-0 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-0.5 py-0.5 shadow-sm ${controlsClass}`}>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => moveBullet(index, -1)}
                disabled={index === 0}
                aria-label="Move bullet point up"
                title="Move up"
                className={iconButtonClass}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => moveBullet(index, 1)}
                disabled={index === summaryBullets.length - 1}
                aria-label="Move bullet point down"
                title="Move down"
                className={iconButtonClass}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => deleteBullet(index)}
                aria-label="Delete bullet point"
                title="Delete"
                className={`${iconButtonClass} hover:text-red-600`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {insertButton(index + 1, "-bottom-2.5")}
          </li>
        ))}
      </ul>
    </section>
  );
}
