import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Check, X } from 'lucide-react';

interface InlinePencilEditorProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'select' | 'date';
  options?: string[];
  className?: string;
  editValue?: string;
}

export default function InlinePencilEditor({
  value,
  onSave,
  type = 'text',
  options = [],
  className = '',
  editValue: editInitialValue,
}: InlinePencilEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const initialEditValue = editInitialValue ?? value;

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(initialEditValue);
    setIsEditing(false);
  };

  const getDisplayValue = () => {
    if (type === 'date' && value && value !== '--') {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
        }
      } catch {}
    }
    return value;
  };

  const getEditDateValue = (v: string) => {
    if (!v || v === '--') return '';
    try {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return v;
  };

  const currentEditValue = type === 'date' && isEditing ? getEditDateValue(editValue) : editValue;

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1"
      >
        {type === 'select' ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="bg-cc-base-elevated border border-cc-warm-primary rounded px-2 py-1 text-sm text-cc-text-high font-sans focus:outline-none"
            autoFocus
          >
            {options.map((opt) => (
              <option key={opt} value={opt} className="bg-cc-base-surface text-cc-text-high">
                {opt}
              </option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            type="date"
            value={currentEditValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="bg-cc-base-elevated border border-cc-warm-primary rounded px-2 py-1 text-sm text-cc-text-high font-sans focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="bg-cc-base-elevated border border-cc-warm-primary rounded px-2 py-1 text-sm text-cc-text-high font-sans focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        )}
        <button onClick={handleSave} className="p-0.5 hover:bg-cc-base-elevated rounded transition-colors">
          <Check size={14} className="text-cc-green" />
        </button>
        <button onClick={handleCancel} className="p-0.5 hover:bg-cc-base-elevated rounded transition-colors">
          <X size={14} className="text-cc-danger" />
        </button>
      </motion.div>
    );
  }

  return (
    <span
      className={`group inline-flex items-center gap-1 cursor-pointer ${className}`}
      onClick={() => {
        setEditValue(initialEditValue);
        setIsEditing(true);
      }}
    >
      <span className="font-sans text-[15px] text-cc-text-high break-words">
        {getDisplayValue()}
      </span>
      <Pencil
        size={14}
        className="text-cc-text-mid opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
    </span>
  );
}
