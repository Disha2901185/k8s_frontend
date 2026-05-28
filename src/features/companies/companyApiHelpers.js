export const extractCompanyItems = (response) => response?.items ?? response?.data?.items ?? [];

export const extractSavedCompany = (response) => response?.id ? response : response?.data ?? null;

export const extractCompanyNames = (companies) => (
    [...new Set(companies.map((company) => company?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b))
);
