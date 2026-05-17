import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router';

const courses = ['Python Full Stack', 'Data Science', 'Machine Learning', 'Web Development', 'Other'];
const branches = ['Main Branch', 'Online', 'Branch A', 'Branch B'];

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  course: string;
  branch: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewRegistrationForm() {
  const { token } = useParams();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: token ? atob(token) : '',
    phone: '',
    dob: '',
    address: '',
    course: '',
    branch: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.course) newErrors.course = 'Please select a course';
    if (!formData.branch) newErrors.branch = 'Please select a branch';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
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
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#5BA87C" strokeWidth="2" />
              <motion.path
                d="M20 32L28 40L44 24"
                stroke="#5BA87C"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </svg>
          </motion.div>
          <h2 className="font-sans text-xl font-semibold text-[#1A1A1A]">Registration Submitted</h2>
          <p className="font-sans text-sm text-[#6A6A6A] mt-2">Thank you! Our HR team will contact you shortly.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EE] py-10 px-4">
      <div className="max-w-[480px] mx-auto">
        {/* Organization Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="font-mono text-base font-medium tracking-[0.08em] text-[#2A2A2A]">Python HR</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8A8A]">Command Center</p>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-[#E0DCD6] rounded p-6 shadow-panel"
        >
          <h1 className="font-sans text-xl font-semibold text-[#1A1A1A]">NEW REGISTRATION</h1>
          <p className="font-sans text-[13px] text-[#6A6A6A] mt-1">Please fill in your details below</p>

          <div className="space-y-4 mt-6">
            {/* Full Name */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                Full Name <span className="text-cc-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                className={inputClass('fullName')}
              />
              {errors.fullName && <p className="text-xs text-cc-danger mt-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                Email Address <span className="text-cc-danger">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your.email@example.com"
                readOnly={!!token}
                className={`${inputClass('email')} ${token ? 'bg-[#F0EEEA]' : ''}`}
              />
              {token && <p className="text-[10px] text-[#8A8A8A] mt-1">Email pre-filled from invitation</p>}
              {errors.email && <p className="text-xs text-cc-danger mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                Phone Number <span className="text-cc-danger">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value.replace(/[^\d+\-\s]/g, ''))}
                placeholder="+91 98765 43210"
                className={inputClass('phone')}
              />
              {errors.phone && <p className="text-xs text-cc-danger mt-1">{errors.phone}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                className={inputClass('dob')}
              />
            </div>

            {/* Address */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Enter your full address"
                rows={3}
                className={`${inputClass('address')} h-auto py-3 resize-none`}
              />
            </div>

            {/* Course */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                Course Interested In <span className="text-cc-danger">*</span>
              </label>
              <select
                value={formData.course}
                onChange={(e) => handleChange('course', e.target.value)}
                className={inputClass('course')}
              >
                <option value="">Select course</option>
                {courses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.course && <p className="text-xs text-cc-danger mt-1">{errors.course}</p>}
            </div>

            {/* Branch */}
            <div>
              <label className="font-sans text-[13px] font-medium text-[#4A4A4A] block mb-1">
                Branch Location <span className="text-cc-danger">*</span>
              </label>
              <select
                value={formData.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                className={inputClass('branch')}
              >
                <option value="">Select branch</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.branch && <p className="text-xs text-cc-danger mt-1">{errors.branch}</p>}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full h-[52px] mt-4 rounded font-mono text-xs font-semibold uppercase tracking-[0.06em] text-white transition-all ${
                isSubmitting ? 'animate-pulse-slow bg-cc-warm-primary/70' : 'bg-cc-warm-primary hover:bg-cc-warm-primary-hover active:translate-y-px'
              }`}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
            </button>
          </div>
        </motion.div>

        <p className="text-center font-sans text-[11px] text-[#9A9590] mt-4">
          Your information is secure and will only be used for enrollment purposes.
        </p>
      </div>
    </div>
  );
}
