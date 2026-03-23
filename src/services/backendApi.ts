type ApiResponseEnvelope<T> = {
  returnCode?: string;
  errorMsg?: string;
  body?: T;
};

type BackendAuthContext = {
  idToken: string;
  userId?: string;
  orgId?: string;
  roleIds?: string[];
};

const AUTH_STORAGE_KEY = "config-center:auth-context";

let backendAuthContext: BackendAuthContext | null = null;

try {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<BackendAuthContext>;
    if (parsed.idToken) {
      backendAuthContext = {
        idToken: parsed.idToken,
        userId: parsed.userId,
        orgId: parsed.orgId,
        roleIds: Array.isArray(parsed.roleIds) ? parsed.roleIds.filter(Boolean) : []
      };
    }
  }
} catch {
  backendAuthContext = null;
}

export function getBackendAuthContext() {
  return backendAuthContext;
}

export function setBackendAuthContext(next: BackendAuthContext | null) {
  backendAuthContext = next;
  try {
    if (!next) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write failures (private mode, quota exceeded, etc.).
  }
}

function buildHeaders(headers?: HeadersInit) {
  const authHeaders: Record<string, string> = {};
  if (backendAuthContext?.idToken) {
    authHeaders.Authorization = `Bearer ${backendAuthContext.idToken}`;
  }
  return {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(headers ?? {})
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponseEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload.errorMsg ?? `请求失败: ${response.status}`);
  }
  if (payload.returnCode && payload.returnCode !== "OK") {
    throw new Error(payload.errorMsg ?? "请求失败");
  }
  return payload.body as T;
}

export async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(init?.headers)
  });
  return parseResponse<T>(response);
}
