import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCVSelection } from "../../provider/hook";
import { resumeLabel } from "../i18n";
import { renderFormattedText } from "../utils/renderFormattedText";

// edit controls must never reach the PDF: hidden-print is stripped by exportToPdf, print:hidden covers window.print
const controlsClass = "hidden-print print:hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10";
const iconButtonClass = "flex items-center justify-center h-4 w-4 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * The resume summary inside a template ({{summary}}): a bullet list, or one paragraph made of the bullets
 * ({{summary style="paragraph"}}). Each bullet/sentence is edited in place; the template CSS styles
 * .cv-summary, .cv-bullets and li.
 */
export default function SummarySlot({ display, lang, className = "" }: { display: "bullets" | "paragraph"; lang: string; className?: string }) {
  const { summaryBullets, setSummaryBullets } = useCVSelection();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = resumeLabel(lang, "summaryBulletPlaceholder");
  const rootRef = useRef<HTMLElement | null>(null);
  const hasText = summaryBullets.some((bullet) => bullet.trim());

  /**
   * A summary with no text yet is still shown in the editor (to be written), but must not print as a lone
   * title: the template element holding the summary (its section) is marked for the PDF export to drop.
   */
  useLayoutEffect(() => {
    const slot = rootRef.current?.parentElement; // the <cv-slot> marker
    const block = slot?.parentElement;
    if (!block || block.classList.contains("cvm-root")) return;
    block.classList.toggle("hidden-print", !hasText);
    return () => block.classList.remove("hidden-print");
  }, [hasText]);

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingIndex]);

  const update = (index: number, value: string) => {
    const updated = [...summaryBullets];
    updated[index] = value;
    setSummaryBullets(updated);
  };

  const insert = (index: number) => {
    const updated = [...summaryBullets];
    updated.splice(index, 0, "");
    setSummaryBullets(updated);
    setEditingIndex(index);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= summaryBullets.length) return;
    const updated = [...summaryBullets];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSummaryBullets(updated);
    setEditingIndex(null);
  };

  const remove = (index: number) => {
    setSummaryBullets(summaryBullets.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  // keep the textarea focused while a control is clicked, so the layout doesn't shift under the pointer
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const editor = (index: number) => (
    <textarea
      ref={textareaRef}
      value={summaryBullets[index]}
      placeholder={placeholder}
      onChange={(e) => {
        update(index, e.target.value);
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
      className="w-full bg-amber-50/80 border border-amber-400 rounded px-1 py-0.5 text-inherit focus:outline-none resize-none font-[inherit] leading-[inherit] print:hidden"
      rows={1}
    />
  );

  const text = (index: number) => (
    <span
      onClick={() => setEditingIndex(index)}
      className="cursor-pointer hover:bg-slate-100 rounded transition-colors print:hover:bg-transparent"
      title="Click to edit"
    >
      {summaryBullets[index] ? renderFormattedText(summaryBullets[index]) : <span className="italic opacity-40">{placeholder}</span>}
    </span>
  );

  if (display === "paragraph") {
    return (
      <p ref={(element) => { rootRef.current = element; }} className={`cv-summary group relative ${className}`}>
        {summaryBullets.map((bullet, index) =>
          editingIndex === index ? (
            <span key={index} className="block">{editor(index)}</span>
          ) : (
            // an empty sentence is only a placeholder, so it's left out of the printed resume
            <span key={index} className={bullet.trim() ? "" : "hidden-print print:hidden"}>
              {text(index)}{index < summaryBullets.length - 1 ? " " : ""}
            </span>
          ),
        )}
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => insert(summaryBullets.length)}
          aria-label="Add a sentence to the summary"
          title="Add a sentence"
          className={`ml-1 inline-flex align-middle items-center justify-center h-4 w-4 rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:text-slate-800 ${controlsClass}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </p>
    );
  }

  const insertButton = (index: number, position: string) => (
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={() => insert(index)}
      aria-label="Insert a bullet point here"
      title="Insert a bullet point here"
      className={`absolute left-1/2 -translate-x-1/2 ${position} flex items-center justify-center h-4 w-4 rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:text-slate-800 hover:border-slate-500 ${controlsClass}`}
    >
      <Plus className="h-3 w-3" />
    </button>
  );

  return (
    <ul ref={(element) => { rootRef.current = element; }} className={`cv-summary cv-bullets ${className}`}>
      {summaryBullets.map((bullet, index) => (
        <li key={index} className={`group relative ${bullet.trim() ? "" : "hidden-print print:hidden"}`}>
          {index === 0 && insertButton(0, "-top-2.5")}
          {editingIndex === index ? editor(index) : text(index)}
          <span className={`absolute -top-3 right-0 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-0.5 py-0.5 shadow-sm ${controlsClass}`}>
            <button type="button" onMouseDown={keepFocus} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move bullet point up" title="Move up" className={iconButtonClass}>
              <ChevronUp className="h-3 w-3" />
            </button>
            <button type="button" onMouseDown={keepFocus} onClick={() => move(index, 1)} disabled={index === summaryBullets.length - 1} aria-label="Move bullet point down" title="Move down" className={iconButtonClass}>
              <ChevronDown className="h-3 w-3" />
            </button>
            <button type="button" onMouseDown={keepFocus} onClick={() => remove(index)} aria-label="Delete bullet point" title="Delete" className={`${iconButtonClass} hover:text-red-600`}>
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
          {insertButton(index + 1, "-bottom-2.5")}
        </li>
      ))}
    </ul>
  );
}
