import { authApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';

export const getMyKeys = async () => callApi(authApi.getLeadApiCredential);
