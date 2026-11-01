import React, { useEffect, useState } from 'react';
import { HardHat } from 'lucide-react';

interface CompanyLogoProps {
  src?: string;
  companyName?: string;
  size?: number;
  className?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  src,
  companyName = '',
  size = 36,
  className = ''
}) => {
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => setHasLoadError(false), [src]);

  if (src && !hasLoadError) {
    return (
      <img
        src={src}
        alt={companyName ? `${companyName} logo` : 'Company logo'}
        width={size}
        height={size}
        onError={() => setHasLoadError(true)}
        className={`shrink-0 rounded-lg object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="BuildPulse logo"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-navy ${className}`}
      style={{ width: size, height: size }}
    >
      <HardHat aria-hidden="true" style={{ width: Math.max(16, size * 0.56), height: Math.max(16, size * 0.56) }} />
    </span>
  );
};
