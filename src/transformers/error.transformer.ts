/**
 * @file Error transform
 * @description Convert error data in various specific formats
 * @module transformer/error
 */

export function getMessageFromNormalError(error: any): any {
  return error?.message || error;
}

export function getMessageFromAxiosError(error: any): any {
  return error?.response?.data || getMessageFromNormalError(error);
}
