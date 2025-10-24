// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

type Json = Record<string, any>;
// lib/api.ts
import { handleSessionExpired } from "@/lib/handleSessionExpired";
let isHandlingExpiry = false;
let refreshInProgress: Promise<boolean> | null = null;

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  console.log(`🌐 API调用: ${init.method || 'GET'} ${API_BASE}${path}`);
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  const baseHeaders: HeadersInit = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };
  if (!isFormData) baseHeaders["Content-Type"] = "application/json";

  const fetchOptions: RequestInit = {
    ...init,
    headers: baseHeaders,
    cache: "no-store",
    credentials: "include",
  };

  let res = await fetch(`${API_BASE}${path}`, fetchOptions);

  // 🧩 Handle expired or missing access token (401)
  if (res.status === 401) {
    console.warn("⚠️ Access token may be expired. Attempting refresh...");

    // If refresh is already happening, wait for it
    if (isHandlingExpiry && refreshInProgress) {
      console.log("⏳ Waiting for ongoing token refresh...");
      const refreshSuccess = await refreshInProgress;
      if (refreshSuccess) {
        console.log("🔁 Refresh completed, retrying request...");
        res = await fetch(`${API_BASE}${path}`, fetchOptions);
      } else {
        console.warn("❌ Refresh failed during concurrent wait.");
        handleSessionExpired();
        throw new Error("UNAUTHORIZED");
      }
    } else {
      isHandlingExpiry = true;

      if (!refreshInProgress) {
        refreshInProgress = attemptTokenRefresh();
      }

      const refreshSuccess = await refreshInProgress;
      refreshInProgress = null;
      isHandlingExpiry = false;

      if (!refreshSuccess) {
        console.warn("❌ Both tokens expired. Logging out...");
        handleSessionExpired();
        throw new Error("UNAUTHORIZED");
      }

      console.log("🟢 Token refreshed silently. Retrying request...");
      res = await fetch(`${API_BASE}${path}`, fetchOptions);
    }
  }

  // 🧾 Handle all other errors
  if (!res.ok && res.status !== 202) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {}
    console.error(`❌ API错误: ${msg}`);
    throw new Error(msg);
  }

  // ✅ Safe JSON parsing even when body is empty
  try {
    const result = (await res.json()) as T;
    console.log(`✅ API响应: ${init.method || 'GET'} ${path}`, result);
    return result;
  } catch {
    console.log(`⚠️ API响应为空: ${init.method || 'GET'} ${path}`);
    return {} as T;
  }
}

/**
 * Attempt to refresh the access token using refresh cookie.
 * Returns true if refresh succeeded, false otherwise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // send refresh cookie
    });

    if (!res.ok) {
      console.error("🔴 Refresh token invalid or expired");
      return false;
    }

    console.log("🟢 Token refresh successful");
    return true;
  } catch (err) {
    console.error("Error refreshing token:", err);
    return false;
  }
}

/**
 * Reset internal refresh handling state (call on logout or login)
 */
export function resetApiAuthState() {
  isHandlingExpiry = false;
  refreshInProgress = null;
}

export const WaApi = {
  // 返回 { dataUrl }，直接给 <img src=... />
  getQr(sessionId: string) {
    console.log("🔍 API调用WaApi.getQr:", sessionId);
    const result = api<{ dataUrl: string }>(`/wa/login/qr?sessionId=${encodeURIComponent(sessionId)}`);
    console.log("📥 WaApi.getQr响应:", result);
    return result;
  },
  getStatus(sessionId: string) {
    console.log("🔍 API调用WaApi.getStatus:", sessionId);
    const result = api<{ status: "INIT" | "LOADING" | "QR_READY" | "QR_SCANNED" | "CONNECTING" | "READY" }>(`/wa/login/status?sessionId=${encodeURIComponent(sessionId)}`);
    console.log("📥 WaApi.getStatus响应:", result);
    return result;
  },
  
  // 新增：获取所有已连接的会话
  getConnectedSessions() {
    console.log("🔍 API调用WaApi.getConnectedSessions");
    return api<{ sessions: Array<{ sessionId: string; status: string }> }>(`/wa/sessions/connected`);
  },

  // 新增：创建新的Session ID
  createSession() {
    console.log("🔍 API调用WaApi.createSession");
    return api<{ sessionId: string }>(`/wa/sessions/create`, { method: "POST" });
  },
};

export const TgApi = {
  // 返回 { loginKey, qrPayload, qrImage }
  startQr() {
    return api<{ loginKey: string; qrPayload: string; qrImage?: string }>(`/tg/qr/start`, { method: "POST" });
  },
  poll(loginKey: string) {
    return api<{ ok?: boolean; pending?: boolean }>(`/tg/qr/poll?loginKey=${encodeURIComponent(loginKey)}`);
  },
  // 手机号登录
  startPhone(phone: string) {
    return api<{ txId: string }>(`/tg/phone/start`, { method: "POST", body: JSON.stringify({ phone }) });
  },
  verifyPhone(
    txId: string,
    code: string,
    password?: string,
    workspaceId?: number,
    brandId?: number,
    description?: string,
    name?: string
  ) {
    return api<{
      ok: boolean;
      message?: string;
      warning?: boolean;
      accountInfo?: {
        displayName: string;
        phoneNumber: string;
      };
    }>(`/tg/phone/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txId,
        code,
        password,
        workspaceId,
        brandId,
        description,
        name,
      }),
    });
  },
  
};

// 账号管理
export const SessionApi = {
  list() {
    return api<Array<{ id: string; provider: string; label?: string; createdAt: string }>>(`/sessions`);
  },
  remove(id: string) {
    return api(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};