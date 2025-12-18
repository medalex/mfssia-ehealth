export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    // axios-like error
    // @ts-ignore
    return error.response?.data?.message ?? error.response?.data ?? 'Request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
