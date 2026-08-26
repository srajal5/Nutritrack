import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Turn a failed response into an ApiError carrying the server's own message.
 * Falls back to a readable description when the body is empty or not JSON —
 * e.g. a bare "405" from a misrouted request used to surface as just "405: ".
 */
async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  let message = "";
  let code: string | undefined;

  const raw = await res.text().catch(() => "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.message || parsed?.error || "";
      code = parsed?.code;
    } catch {
      // Non-JSON body (an HTML error page, for instance) — ignore the noise.
    }
  }

  if (!message) {
    message = res.statusText || `Request failed with status ${res.status}`;
  }

  throw new ApiError(res.status, message, code);
}

export const apiRequest = async (
  method: string,
  path: string,
  body?: any
): Promise<Response> => {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include", // This is important for session cookies
    body: body ? JSON.stringify(body) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // This is important for session cookies
      headers: {
        Accept: "application/json",
      },
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
      staleTime: 30 * 1000, // 30 seconds — allows invalidation to trigger refetch
      retry: (failureCount, error) => {
        // Never retry auth/permission failures; they will not fix themselves.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
