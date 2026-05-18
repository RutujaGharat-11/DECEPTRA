const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
