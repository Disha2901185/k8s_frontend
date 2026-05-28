/**
 * API SERVICE (MIDDLEWARE)
 * This wrapper simplifies API calls by:
 * 1. Returning response.data directly.
 * 2. Providing a consistent error handling wrapper.
 */

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

export const callApi = async (apiFunc, ...args) => {
  try {
    const response = await apiFunc(...args);
    return response.data;
  } catch (error) {
    // Standardize error reporting
    let rawMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    let message = rawMessage;

    // Handle NestJS nested error structures (e.g., { message: { message: [...] } })
    if (typeof rawMessage === 'object' && rawMessage !== null && rawMessage.message) {
      message = rawMessage.message;
    }

    // Handle Arrays (validation messages)
    if (Array.isArray(message)) {
      message = message.join(', ');
    } else if (typeof message === 'object' && message !== null) {
      message = JSON.stringify(message);
    }

    const status = error.response?.status;

    // Log error for debugging (using the standardized string message)
    console.error(`[API Error] ${status || 'Unknown'}: ${message}`);

    // Re-throw standardized error with string message
    throw {
      message: String(message),
      status,
      data: error.response?.data,
      originalError: error
    };
  }
};
