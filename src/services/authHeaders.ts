import { useUserStore } from '../stores/auth';

export function getAuthHeaders(): HeadersInit {
  const token = useUserStore().token;
  if (!token) throw new Error('Not authenticated.');
  return { Authorization: `Bearer ${token}` };
}

export function getJsonAuthHeaders(): HeadersInit {
  return { ...getAuthHeaders(), 'Content-Type': 'application/json' };
}

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export async function responseError(
  response: Response,
  fallback: string
): Promise<ApiResponseError> {
  let message = fallback;
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'detail' in data) {
      if (typeof data.detail === 'string') message = data.detail;
      else if (Array.isArray(data.detail)) {
        const first: unknown = data.detail[0];
        if (
          typeof first === 'object' &&
          first !== null &&
          'msg' in first &&
          typeof first.msg === 'string'
        )
          message = first.msg;
      }
    }
  } catch {
    // HTTP failures can have an empty or non-JSON body.
  }
  return new ApiResponseError(message, response.status);
}
