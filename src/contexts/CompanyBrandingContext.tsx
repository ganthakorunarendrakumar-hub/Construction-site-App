import { createContext, useContext } from 'react';

interface CompanyBrandingContextValue {
  companyName: string;
  companyLogoUrl?: string;
}

export const CompanyBrandingContext = createContext<CompanyBrandingContextValue>({
  companyName: '',
  companyLogoUrl: undefined
});

export const useCompanyBranding = (): CompanyBrandingContextValue => useContext(CompanyBrandingContext);
