import { useState, useRef, useEffect } from "react";
import { useCVSelection } from "../../provider/hook";
import { i18n } from "../i18n";

export default function CVSummary({ lang = 'en' }: { lang?: string }) {
  const { summaryBullets, setSummaryBullets } = useCVSelection();
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

  if (!summaryBullets || summaryBullets.length === 0) return null;

  const handleBulletChange = (index: number, newValue: string) => {
    const updated = [...summaryBullets];
    updated[index] = newValue;
    setSummaryBullets(updated);
  };

  return (
    <section className="flex flex-col gap-1.5">
        <h2 className="text-[12px] font-semibold text-slate-800 uppercase tracking-wide">{t.resumeSummaryTitle}</h2>
      <ul className="list-disc list-outside ml-4 flex flex-col gap-1 text-[11px] text-slate-700 leading-snug">
        {summaryBullets.map((bullet, index) => (
          <li key={index} className="pl-0.5">
            {editingIndex === index ? (
              <textarea
                ref={textareaRef}
                value={bullet}
                onChange={(e) => handleBulletChange(index, e.target.value)}
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
                title="Cliquer pour modifier"
              >
                {bullet}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}