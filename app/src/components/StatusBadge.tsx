interface StatusBadgeProps {
  label: string;
  variant: 'amber' | 'blue' | 'green' | 'red' | 'neutral';
  size?: 'sm' | 'md';
}

const variants = {
  amber: 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C]',
  blue: 'bg-[rgba(91,143,191,0.12)] text-[#5B8FBF]',
  green: 'bg-[rgba(91,168,124,0.12)] text-[#5BA87C]',
  red: 'bg-[rgba(201,75,75,0.12)] text-[#C94B4B]',
  neutral: 'bg-cc-base-elevated-strong text-cc-text-low',
};

export default function StatusBadge({ label, variant, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[9px] tracking-[0.04em] px-2 py-0.5'
    : 'text-[11px] tracking-[0.04em] px-2.5 py-1';

  return (
    <span className={`inline-block font-mono font-medium uppercase rounded-sm ${sizeClasses} ${variants[variant]}`}>
      {label}
    </span>
  );
}
