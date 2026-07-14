import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useParams } from 'react-router';
import { useStore } from '@/store/useStore';
import { sheetsApi } from '@/services/sheetsApi';

interface CompanyEntry {
  name: string;
  designation: string;
  duration: string;
}

interface FormData {
  aadhar: string;
  address: string;
  emergencyContact: string;
  companies: CompanyEntry[];
  documents: {
    offerLetter: boolean;
    appraisals: boolean;
    payslips: boolean;
    relievingLetter: boolean;
    counterOffer: boolean;
  };
}

interface FormErrors {
  [key: string]: string;
}

const docItems = [
  { key: 'offerLetter' as const, label: 'Offer Letter' },
  { key: 'appraisals' as const, label: 'Appraisals' },
  { key: 'payslips' as const, label: 'Payslips' },
  { key: 'relievingLetter' as const, label: 'Relieving Letter' },
  { key: 'counterOffer' as const, label: 'Counter Offer' },
];

export default function BGVForm() {
  const { token } = useParams();
  
  let candidateEmail = '';
  try {
    if (token) candidateEmail = atob(token);
  } catch (e) {
    console.error('Failed to decode BGV token:', e);
  }

  const candidate = useStore((s) => s.candidates.find((c) => c.email.toLowerCase() === candidateEmail.toLowerCase()));

  const [formData, setFormData] = useState<FormData>({
    aadhar: '',
    address: '',
    emergencyContact: '',
    companies: [{ name: '', designation: '', duration: '' }],
    documents: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleDocToggle = (key: keyof FormData['documents']) => {
    setFormData((prev) => ({
      ...prev,
      documents: { ...prev.documents, [key]: !prev.documents[key] },
    }));
  };

  const handleCompanyChange = (index: number, field: keyof CompanyEntry, value: string) => {
    setFormData((prev) => ({
      ...prev,
      companies: prev.companies.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const addCompany = () => {
    if (formData.companies.length >= 10) return;
    setFormData((prev) => ({
      ...prev,
      companies: [...prev.companies, { name: '', designation: '', duration: '' }],
    }));
  };

  const removeCompany = (index: number) => {
    if (formData.companies.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      companies: prev.companies.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.aadhar.trim() || !/^\d{12}$/.test(formData.aadhar.replace(/\s/g, '')))
      newErrors.aadhar = 'Enter a valid 12-digit Aadhar number';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.emergencyContact.trim()) newErrors.emergencyContact = 'Emergency contact is required';
    const hasDoc = Object.values(formData.documents).some(Boolean);
    if (!hasDoc) newErrors.documents = 'Select at least one document';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await sheetsApi.appendBGV({
        ...formData,
        candidateId: candidate?.id || '',
        fullName: candidate?.fullName || 'Rahul Sharma',
        email: candidate?.email || 'rahul.sharma@email.com',
        phone: candidate?.phone || '+91 98765 43210',
        token: token || ''
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Submission failed', error);
      alert('Failed to submit BGV form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full h-12 bg-[#F9F7F4] border rounded px-4 font-sans text-[15px] text-[#1A1A1A] placeholder:text-[#9A9590] focus:outline-none transition-colors ${
      errors[field] ? 'border-cc-danger shadow-[0_0_0_3px_rgba(201,75,75,0.1)]' : 'border-[#D8D4CE] focus:border-cc-warm-primary'
    }`;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} className="w-16 h-16 mx-auto mb-4">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#5BA87C" strokeWidth="2" />
              <motion.path d="M20 32L28 40L44 24" stroke="#5BA87C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
            </svg>
          </motion.div>
          <h2 className="font-sans text-xl font-semibold text-[#1A1A1A]">BGV Form Submitted</h2>
          <p className="font-sans text-sm text-[#6A6A6A] mt-2">Our team will review your details and initiate the verification process.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EE] py-10 px-4">
      <div className="max-w-[480px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="font-mono text-base font-medium tracking-[0.08em] text-[#2A2A2A]">Python HR</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8A8A]">Command Center</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-[#E0DCD6] rounded p-6 shadow-panel">
          <h1 className="font-sans text-xl font-semibold text-[#1A1A1A]">BACKGROUND VERIFICATION</h1>
          <p className="font-sans text-[13px] text-[#6A6A6A] mt-1">Please verify and complete your background information</p>

          <div className="space-y-5 mt-6">
            {/* Personal Details - Pre-filled */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8A8A] border-b border-[#E0DCD6] pb-2 mb-4">PERSONAL DETAILS</h3>
              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: candidate?.fullName || 'Rahul Sharma', readOnly: true },
                  { label: 'Email', value: candidate?.email || 'rahul.sharma@email.com', readOnly: true },
                  { label: 'Phone', value: candidate?.phone || '+91 98765 43210', readOnly: true },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">{field.label}</label>
                    <input type="text" value={field.value} readOnly className="w-full h-12 bg-[#F0EEEA] border border-[#D8D4CE] rounded px-4 font-sans text-[15px] text-[#8A8A8A]" />
                  </div>
                ))}

                {/* Editable fields */}
                <div>
                  <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                    Aadhar Number <span className="text-cc-danger">*</span>
                  </label>
                  <input
                    type="text" value={formData.aadhar} maxLength={14}
                    onChange={(e) => setFormData((p) => ({ ...p, aadhar: e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') }))}
                    placeholder="Enter your Aadhar number" className={inputClass('aadhar')}
                  />
                  {errors.aadhar && <p className="text-xs text-cc-danger mt-1">{errors.aadhar}</p>}
                </div>

                <div>
                  <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                    Current Address <span className="text-cc-danger">*</span>
                  </label>
                  <textarea value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Enter your current residential address" rows={3} className={`${inputClass('address')} h-auto py-3 resize-none`} />
                  {errors.address && <p className="text-xs text-cc-danger mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                    Emergency Contact <span className="text-cc-danger">*</span>
                  </label>
                  <input type="text" value={formData.emergencyContact} onChange={(e) => setFormData((p) => ({ ...p, emergencyContact: e.target.value }))}
                    placeholder="Name and phone number" className={inputClass('emergencyContact')} />
                  {errors.emergencyContact && <p className="text-xs text-cc-danger mt-1">{errors.emergencyContact}</p>}
                </div>
              </div>
            </div>

            {/* Employment History */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8A8A] border-b border-[#E0DCD6] pb-2 mb-4">EMPLOYMENT HISTORY</h3>
              <p className="font-sans text-xs text-[#6A6A6A] mb-3">List all companies you have worked for</p>

              <div className="space-y-3">
                {formData.companies.map((company, i) => (
                  <motion.div key={i} layout className="grid grid-cols-3 gap-2 items-start">
                    <input type="text" value={company.name} onChange={(e) => handleCompanyChange(i, 'name', e.target.value)}
                      placeholder="Company" className="h-10 bg-[#F9F7F4] border border-[#D8D4CE] rounded px-3 font-sans text-sm text-[#1A1A1A] placeholder:text-[#9A9590] focus:outline-none focus:border-cc-warm-primary" />
                    <input type="text" value={company.designation} onChange={(e) => handleCompanyChange(i, 'designation', e.target.value)}
                      placeholder="Role" className="h-10 bg-[#F9F7F4] border border-[#D8D4CE] rounded px-3 font-sans text-sm text-[#1A1A1A] placeholder:text-[#9A9590] focus:outline-none focus:border-cc-warm-primary" />
                    <div className="flex gap-1">
                      <input type="text" value={company.duration} onChange={(e) => handleCompanyChange(i, 'duration', e.target.value)}
                        placeholder="Duration" className="flex-1 h-10 bg-[#F9F7F4] border border-[#D8D4CE] rounded px-3 font-sans text-sm text-[#1A1A1A] placeholder:text-[#9A9590] focus:outline-none focus:border-cc-warm-primary" />
                      {formData.companies.length > 1 && (
                        <button onClick={() => removeCompany(i)} className="p-2 text-[#C0BCB6] hover:text-cc-danger transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {formData.companies.length < 10 && (
                <button onClick={addCompany}
                  className="w-full mt-3 h-10 rounded border border-dashed border-[#D8D4CE] font-mono text-[11px] text-cc-warm-primary hover:border-cc-warm-primary hover:bg-[rgba(184,92,61,0.04)] transition-colors">
                  + ADD COMPANY
                </button>
              )}
            </div>

            {/* Documents Submitted */}
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8A8A8A] border-b border-[#E0DCD6] pb-2 mb-4">DOCUMENTS SUBMITTED</h3>
              <p className="font-sans text-xs text-[#6A6A6A] mb-3">Check all documents you have available</p>

              <div className="space-y-2">
                {docItems.map((doc) => (
                  <button key={doc.key} onClick={() => handleDocToggle(doc.key)}
                    className="flex items-center gap-3 w-full text-left py-2">
                    <motion.div animate={{ backgroundColor: formData.documents[doc.key] ? '#5BA87C' : '#F9F7F4', borderColor: formData.documents[doc.key] ? '#5BA87C' : '#D8D4CE' }}
                      className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0">
                      {formData.documents[doc.key] && (
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                      )}
                    </motion.div>
                    <span className={`font-sans text-[15px] ${formData.documents[doc.key] ? 'text-[#1A1A1A]' : 'text-[#6A6A6A]'}`}>{doc.label}</span>
                  </button>
                ))}
              </div>
              {errors.documents && <p className="text-xs text-cc-danger mt-1">{errors.documents}</p>}
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={isSubmitting}
              className={`w-full h-[52px] mt-4 rounded font-mono text-xs font-semibold uppercase tracking-[0.06em] text-white transition-all ${
                isSubmitting ? 'animate-pulse-slow bg-cc-warm-primary/70' : 'bg-cc-warm-primary hover:bg-cc-warm-primary-hover active:translate-y-px'
              }`}>
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT BGV FORM'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
