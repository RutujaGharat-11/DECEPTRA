const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

let hasWarnedMissingApiBase = false;

function warnMissingApiBaseOnce() {
  if (hasWarnedMissingApiBase) return;
  hasWarnedMissingApiBase = true;

  // Developer-friendly warning without crashing the app at runtime.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[API] NEXT_PUBLIC_API_URL is not configured. Falling back to relative API paths. ' +
      'Create `.env.local` with NEXT_PUBLIC_API_URL=https://YOUR-RENDER-BACKEND.onrender.com'
    );
  }
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE_URL) {
    warnMissingApiBaseOnce();
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}
