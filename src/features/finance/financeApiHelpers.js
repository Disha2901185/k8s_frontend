import { CURRENCY_OPTIONS } from '@/lib/const';

export const extractListPayload = (response) => ({
  items: response?.items ?? [],
  pagination: response?.pagination ?? {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
});

export const formatCurrency = (
  value,
  currency = 'INR',
  maximumFractionDigits = 0,
  minimumFractionDigits = 0,
) => {
  const normalizedCurrency = (currency || 'INR').toUpperCase();
  const symbol = CURRENCY_OPTIONS.find((option) => option.value === normalizedCurrency)?.symbol;
  const numericValue = Number(value || 0);

  if (symbol) {
    const formattedNumber = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(numericValue);
    return `${symbol}${formattedNumber}`;
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(numericValue);
  } catch {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(numericValue);
  }
};

export const normalizeApiError = (error, fallback = 'Something went wrong') => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || fallback;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  // Handle ISO strings or YYYY-MM-DD
  const pureDate = dateStr.split('T')[0];
  const parts = pureDate.split('-');
  if (parts.length === 3) {
    // If it's YYYY-MM-DD, convert to DD-MM-YYYY
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
};
