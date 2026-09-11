import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useCVSelection } from "../../provider/hook";
import { Sparkles } from "lucide-react";
import { TemplateSkeleton } from "./TemplateSkeleton";
import type { EntityType } from "@shared/utils";
import { toggleBold } from "../utils/toggleBold";
import { renderFormattedText } from "../utils/renderFormattedText";

interface FieldProps {
  entityType: EntityType;
  id: string;
  field: string;
  defaultValue: string;
  className?: string;
  placeholder?: string;
  isLoading?: boolean;
}

export function TemplateTextArea({
  entityType,
  id,
  field,
  defaultValue,
  className = '',
  placeholder = '...',
  isLoading = false
}: FieldProps) {
  const { getCustomField, updateCustomField } = useCVSelection();
  const value = getCustomField(entityType, id, field, defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const updateTempValue = () => setTempValue(value);
    updateTempValue();
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    updateCustomField(entityType, id, field, tempValue);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "b"
    ) {
      event.preventDefault();
      event.stopPropagation();

      const selectionStart =
        event.currentTarget.selectionStart ?? 0;
      const selectionEnd =
        event.currentTarget.selectionEnd ?? selectionStart;

      const result = toggleBold(
        tempValue,
        selectionStart,
        selectionEnd,
      );

      setTempValue(result.value);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          result.selectionStart,
          result.selectionEnd,
        );
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <Sparkles size={13} className="animate-spin text-amber-500 shrink-0" />
        <TemplateSkeleton lines={2} className={className} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={Math.max(2, tempValue.split("\n").length)}
        className={`w-full bg-amber-50/80 border border-amber-400 rounded p-1 outline-none text-justify resize-none animate-in fade-in duration-100 print:hidden ${className}`}
      />
    );
  }

  return (
    <p
      onClick={() => setIsEditing(true)}
      title="Cliquer pour modifier"
      className={`cursor-pointer hover:bg-slate-100 rounded px-0.5 transition-colors whitespace-pre-line text-justify print:hover:bg-transparent ${className}`}
    >
      {value
        ? renderFormattedText(value)
        : <span className="italic opacity-40">{placeholder}</span>
      }
    </p>
  );
}