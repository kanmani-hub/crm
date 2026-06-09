import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Plus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AppSettings } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import { sheetsApi } from '@/services/sheetsApi';

type ArraySettingKey = 'courses' | 'branches';
type SheetLinkKey = keyof AppSettings['googleSheetLinks'];

const formLinkFields: { key: SheetLinkKey; label: string; hint: string }[] = [
  { key: 'registrationForm', label: 'Registration Form Link', hint: 'Link to the Google Form (docs.google.com/forms)' },
  { key: 'bgvForm', label: 'BGV Form Link', hint: 'Link to the BGV Form (docs.google.com/forms)' },
];

const sheetLinkFields: { key: SheetLinkKey; label: string; hint: string }[] = [
  { key: 'candidateMaster', label: 'Candidate Master Sheet', hint: 'Primary candidate profile and status data' },
  { key: 'registrations', label: 'Registration Responses Sheet', hint: 'New registration form submissions' },
  { key: 'bgvResponses', label: 'BGV Responses Sheet', hint: 'Background verification form submissions' },
  { key: 'financials', label: 'Financial Pipeline Sheet', hint: 'Fee, payment, discount, and due records' },
  { key: 'auditLogs', label: 'Audit Logs Sheet', hint: 'Structural, BGV, and financial change history' },
  { key: 'settings', label: 'Settings Sheet', hint: 'Dropdowns, branches, and app configuration' },
];

export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useStore();
  const [formSettings, setFormSettings] = useState<AppSettings>({ ...settings });
  const [newCourse, setNewCourse] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newCCEmail, setNewCCEmail] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const ccEmailsList = formSettings.hrCCEmail
    ? formSettings.hrCCEmail
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  const addCCEmail = () => {
    console.log("Add clicked (CC Email)");
    console.log("Value:", newCCEmail);
    console.log("Settings before:", formSettings);

    const trimmed = newCCEmail.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      showToast('Enter a valid email address', 'error');
      return;
    }
    const currentList = Array.isArray(ccEmailsList) ? ccEmailsList : [];
    if (currentList.some((email) => email && email.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Email already added', 'info');
      return;
    }
    const updatedList = [...currentList, trimmed];
    updateField('hrCCEmail', updatedList.join(', '));
    setNewCCEmail('');
    showToast(`Added ${trimmed} to CC list`, 'success');
  };

  const removeCCEmail = (index: number) => {
    const updatedList = ccEmailsList.filter((_, i) => i !== index);
    updateField('hrCCEmail', updatedList.join(', '));
    showToast('Removed email from CC list', 'info');
  };

  useEffect(() => {
    setHasChanges(JSON.stringify(formSettings) !== JSON.stringify(settings));
  }, [formSettings, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Persist to backend Excel database
      const appSettingsToSave: Record<string, string> = {
        orgName: formSettings.orgName,
        bgvTeamEmail: formSettings.bgvTeamEmail,
        hrCCEmail: formSettings.hrCCEmail,
        gasWebAppUrl: formSettings.gasWebAppUrl,
        courses: Array.isArray(formSettings.courses) ? formSettings.courses.join(',') : '',
        branches: Array.isArray(formSettings.branches) ? formSettings.branches.join(',') : '',
      };
      const sheetLinksToSave: Record<string, string> = { ...formSettings.googleSheetLinks };
      
      await sheetsApi.saveSettings(appSettingsToSave, sheetLinksToSave);
      
      updateSettings(formSettings);
      setSaved(true);
      showToast('HR settings saved to database');
      setTimeout(() => setSaved(false), 3000);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
      // Still update local state even if backend fails
      updateSettings(formSettings);
      showToast('Settings saved locally (backend sync failed)', 'error');
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setFormSettings((s) => ({ ...s, [key]: value }));
  };

  const updateSheetLink = (key: SheetLinkKey, value: string) => {
    setFormSettings((s) => ({
      ...s,
      googleSheetLinks: { ...s.googleSheetLinks, [key]: value },
    }));
  };

  const addOption = (key: ArraySettingKey, value: string, clear: () => void) => {
    console.log("Add clicked");
    console.log("Value:", value);
    console.log("Settings before:", formSettings);

    const nextValue = value.trim();
    if (!nextValue) return;
    
    setFormSettings((s) => {
      const currentArray = Array.isArray(s[key]) ? s[key] : [];
      if (currentArray.some((item) => item && item.toLowerCase() === nextValue.toLowerCase())) {
        showToast(`${nextValue} is already in the list`, 'info');
        return s;
      }
      const updatedSettings = { ...s, [key]: [...currentArray, nextValue] };
      console.log("Settings after:", updatedSettings);
      return updatedSettings;
    });
    
    clear();
    showToast(`Added ${nextValue}`, 'success');
  };

  const removeOption = (key: ArraySettingKey, i: number) => {
    setFormSettings((s) => {
      const currentArray = Array.isArray(s[key]) ? s[key] : [];
      return { ...s, [key]: currentArray.filter((_, idx) => idx !== i) };
    });
    showToast('Item removed', 'info');
  };

  return (
    <div className="min-h-screen bg-cc-base-deep pt-20">
      <TopNavigationBar />
      <Toast />

      <div className="max-w-[1040px] mx-auto px-4 lg:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-mono text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-tight text-cc-text-high">
            HR SETTINGS
          </h1>
          <p className="mt-2 font-sans text-[13px] text-cc-text-mid">
            Configure dropdown values, branch lists, BGV routing, and Google Sheet sources.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <section className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
            <h3 className="section-header mb-4">GENERAL CONFIGURATION</h3>

            <div className="space-y-4">
              <SettingsInput
                label="Organization Name"
                value={formSettings.orgName}
                onChange={(value) => updateField('orgName', value)}
              />
              <SettingsInput
                label="BGV Team Mail ID"
                type="email"
                value={formSettings.bgvTeamEmail}
                onChange={(value) => updateField('bgvTeamEmail', value)}
              />
              
              <div className="border-t border-cc-gridline/40 pt-4 mt-2">
                <label className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid block mb-1.5">
                  HR CC Mail IDs (Registration)
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newCCEmail}
                    placeholder="Add CC email address..."
                    onChange={(e) => setNewCCEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCCEmail();
                      }
                    }}
                    className="min-w-0 flex-1 h-10 bg-cc-base-elevated border border-cc-gridline rounded px-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCCEmail}
                    className="h-10 w-10 inline-flex items-center justify-center rounded bg-cc-base-elevated border border-cc-gridline text-cc-warm-text hover:border-cc-warm-primary transition-colors"
                    aria-label="Add CC Email"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {ccEmailsList.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                    {ccEmailsList.map((email, i) => (
                      <span
                        key={`${email}-${i}`}
                        className="inline-flex max-w-full items-center gap-1.5 border rounded-sm px-2 py-0.5 bg-[rgba(184,92,61,0.08)] border-[rgba(184,92,61,0.15)]"
                      >
                        <span className="font-mono text-[10px] text-cc-warm-text truncate">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeCCEmail(i)}
                          className="text-cc-text-low hover:text-cc-danger transition-colors"
                          aria-label={`Remove ${email}`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-cc-text-low italic">No CC emails added yet.</p>
                )}
                <p className="mt-1 text-[11px] text-cc-text-mid">
                  Receives copies of dispatched registration forms
                </p>
              </div>

              <SettingsInput
                label="Google Apps Script Web App URL"
                type="url"
                value={formSettings.gasWebAppUrl}
                hint="Required for sending form links without backend server"
                placeholder="https://script.google.com/macros/s/.../exec"
                onChange={(value) => updateField('gasWebAppUrl', value)}
              />
            </div>

            <div className="mt-8">
              <h3 className="section-header mb-4">DROPDOWNS</h3>
              <OptionEditor
                label="Courses Dropdown"
                value={newCourse}
                options={formSettings.courses}
                placeholder="Add course"
                tone="green"
                onValueChange={setNewCourse}
                onAdd={() => addOption('courses', newCourse, () => setNewCourse(''))}
                onRemove={(i) => removeOption('courses', i)}
              />
              <div className="mt-5">
                <OptionEditor
                  label="Branches Dropdown"
                  value={newBranch}
                  options={formSettings.branches}
                  placeholder="Add branch"
                  tone="blue"
                  onValueChange={setNewBranch}
                  onAdd={() => addOption('branches', newBranch, () => setNewBranch(''))}
                  onRemove={(i) => removeOption('branches', i)}
                />
              </div>
            </div>

          </section>

          <section className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={15} className="text-cc-warm-text" />
              <h3 className="section-header">GOOGLE FORM LINKS</h3>
            </div>
            <div className="space-y-4 mb-8">
              {formLinkFields.map((field) => {
                const value = formSettings.googleSheetLinks[field.key] || '';
                const isInvalid = value.length > 0 && (!value.includes('docs.google.com/forms') && !value.includes('forms.gle'));
                return (
                  <SettingsInput
                    key={field.key}
                    label={field.label}
                    hint={isInvalid ? '⚠️ Must be a valid Google Form URL' : field.hint}
                    type="url"
                    value={value}
                    placeholder="https://docs.google.com/forms/d/..."
                    onChange={(val) => updateSheetLink(field.key, val)}
                    hasError={isInvalid}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Link2 size={15} className="text-cc-warm-text" />
              <h3 className="section-header">GOOGLE SHEET LINKS</h3>
            </div>
            <div className="space-y-4">
              {sheetLinkFields.map((field) => {
                const value = formSettings.googleSheetLinks[field.key] || '';
                const isInvalid = value.length > 0 && !value.includes('docs.google.com/spreadsheets');
                return (
                  <SettingsInput
                    key={field.key}
                    label={field.label}
                    hint={isInvalid ? '⚠️ Must be a valid Google Spreadsheet URL' : field.hint}
                    type="url"
                    value={value}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    onChange={(val) => updateSheetLink(field.key, val)}
                    hasError={isInvalid}
                  />
                );
              })}
            </div>
          </section>
        </motion.div>

        <div className="mt-6 flex items-center gap-3">
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            whileTap={{ scale: 0.98 }}
            className={`px-8 py-3 font-mono text-xs font-semibold uppercase tracking-wider rounded transition-all ${
              saved
                ? 'bg-cc-green text-white'
                : 'bg-cc-warm-primary text-white hover:bg-cc-warm-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSaving ? 'SAVING...' : saved ? 'SAVED' : 'SAVE CHANGES'}
          </motion.button>
          {hasChanges && (
            <span className="micro-text text-cc-text-mid">
              Unsaved HR settings changes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsInput({
  label,
  hint,
  type = 'text',
  value,
  placeholder,
  onChange,
  hasError = false,
}: {
  label: string;
  hint?: string;
  type?: 'text' | 'email' | 'url';
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) {
  return (
    <div>
      <label className={`font-mono text-[10px] font-medium uppercase tracking-[0.06em] block mb-1.5 ${hasError ? 'text-cc-danger' : 'text-cc-text-mid'}`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-10 bg-cc-base-elevated border rounded px-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:outline-none transition-colors ${
          hasError 
            ? 'border-cc-danger focus:border-cc-danger shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' 
            : 'border-cc-gridline focus:border-cc-warm-primary'
        }`}
      />
      {hint && <p className={`mt-1 text-[11px] ${hasError ? 'text-cc-danger font-medium' : 'text-cc-text-mid'}`}>{hint}</p>}
    </div>
  );
}

function OptionEditor({
  label,
  value,
  options,
  placeholder,
  tone,
  onValueChange,
  onAdd,
  onRemove,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  tone: 'green' | 'blue';
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const toneClass = tone === 'green'
    ? 'bg-[rgba(91,168,124,0.08)] border-[rgba(91,168,124,0.15)]'
    : 'bg-[rgba(91,143,191,0.08)] border-[rgba(91,143,191,0.15)]';

  return (
    <div>
      <label className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid block mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          className="min-w-0 flex-1 h-10 bg-cc-base-elevated border border-cc-gridline rounded px-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={onAdd}
          className="h-10 w-10 inline-flex items-center justify-center rounded bg-cc-base-elevated border border-cc-gridline text-cc-warm-text hover:border-cc-warm-primary transition-colors"
          aria-label={`Add ${label}`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, i) => (
          <span
            key={`${option}-${i}`}
            className={`inline-flex max-w-full items-center gap-1 border rounded-sm px-2 py-0.5 ${toneClass}`}
          >
            <span className="font-mono text-[10px] text-cc-warm-text truncate">{option}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-cc-text-low hover:text-cc-danger transition-colors"
              aria-label={`Remove ${option}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
