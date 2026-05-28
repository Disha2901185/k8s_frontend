import { z } from 'zod';

export const COMPANY_STATUS_OPTIONS = [
    { value: 'Prospect', label: 'Prospect' },
    { value: 'Client', label: 'Client' },
];

export const COMPANY_INDUSTRY_OPTIONS = [
    { value: 'IT Services', label: 'IT Services' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Other', label: 'Other' },
];

const isValidWebsite = (value) => {
    if (!value) return true;

    try {
        const normalized = value.startsWith('http://') || value.startsWith('https://')
            ? value
            : `https://${value}`;

        const url = new URL(normalized);
        return Boolean(url.hostname);
    } catch {
        return false;
    }
};

export const companyFormSchema = z.object({
    name: z.string().trim().min(1, 'Company name is required'),
    industry: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    website: z.string().optional().default('').refine(isValidWebsite, 'Invalid website'),
    status: z.enum(['Prospect', 'Client']).default('Prospect'),
    address: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    country: z.string().optional().default('India'),
    zipCode: z.string().optional().default(''),
    taxId: z.string().optional().default(''),
});

export const getCompanyFormDefaults = (company = null) => ({
    name: company?.name ?? '',
    industry: company?.industry ?? '',
    phone: company?.phone ?? '',
    website: company?.website ?? '',
    status: company?.status ?? 'Prospect',
    address: company?.billingStreet ?? '',
    city: company?.billingCity ?? '',
    state: company?.billingState ?? '',
    country: company?.billingCountry ?? 'India',
    zipCode: company?.billingZip ?? '',
    taxId: company?.taxId ?? '',
});

const clean = (value) => {
    if (typeof value !== 'string') return value ?? undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

export const normalizeCompanyPayload = (values) => ({
    name: clean(values.name),
    industry: clean(values.industry),
    phone: clean(values.phone),
    website: clean(values.website),
    status: clean(values.status) ?? 'Prospect',
    taxId: clean(values.taxId),
    billingStreet: clean(values.address),
    billingCity: clean(values.city),
    billingState: clean(values.state),
    billingCountry: clean(values.country),
    billingZip: clean(values.zipCode),
});

const resolveErrorMessage = (value) => {
    if (Array.isArray(value)) {
        const parts = value.map(resolveErrorMessage).filter(Boolean);
        return parts.length ? parts.join(', ') : '';
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    if (value && typeof value === 'object') {
        return resolveErrorMessage(value.message ?? value.error);
    }

    return '';
};

export const getCompanyErrorMessage = (error, fallback = 'Unable to save company') => {
    const message = resolveErrorMessage(error?.response?.data?.message)
        || resolveErrorMessage(error?.response?.data)
        || resolveErrorMessage(error?.message);

    return message || fallback;
};

export const getCompanyWebsiteHref = (website) => {
    if (!website) return null;
    return website.startsWith('http://') || website.startsWith('https://')
        ? website
        : `https://${website}`;
};
