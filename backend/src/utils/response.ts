export interface ApiResponse<T = any> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
  };
}

export function errorResponse(
  message: string,
  code = 'INTERNAL_ERROR',
  details: any = []
): ApiResponse<null> {
  return {
    data: null,
    error: {
      code,
      message,
      details,
    },
  };
}
