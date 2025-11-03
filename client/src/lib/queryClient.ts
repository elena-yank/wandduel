import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Resolve API base URL depending on environment
export function apiUrl(path: string): string {
  if (/^https?:/i.test(path)) return path; // absolute URL passed
  const isDev = import.meta.env.DEV;
  const explicitDevOrigin = import.meta.env.VITE_API_ORIGIN as string | undefined;
  // If no explicit origin in dev, return relative path to use Vite proxy
  if (isDev && !explicitDevOrigin) return path;
  const devOrigin = explicitDevOrigin || "http://127.0.0.1:5000";
  const origin = isDev ? devOrigin : window.location.origin;
  return `${origin}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "same-origin",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(apiUrl(queryKey.join("/") as string), {
      credentials: "same-origin",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 минут для большинства данных
      gcTime: 10 * 60 * 1000, // 10 минут в кэше
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
