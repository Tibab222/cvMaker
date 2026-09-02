import { useEffect, useRef, useState } from "react";
import { useCVSelection } from "../../provider/hook";
import type { EntityType } from "../../provider/provider";

interface FieldProps {
  entityType: EntityType;
  id: string;
  field: string;
  defaultValue: string;
  className?: string;
  placeholder?: string;
}

export function TemplateTextArea({
  entityType,
  id,
  field,
  defaultValue,
  className = '',
  placeholder = '...'
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

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        rows={Math.max(2, tempValue.split('\n').length)}
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
      {value || <span className="italic opacity-40">{placeholder}</span>}
    </p>
  );
}