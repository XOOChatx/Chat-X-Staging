// src/lib/authRefresher.ts
const API_URL = process.env.NEXT_PUBLIC_API_BASE;
let refreshInterval: NodeJS.Timeout | null = null;

/**
 * Start automatic silent refresh every X minutes.
 * @param intervalMinutes how often to refresh (e.g. 14 if access = 15 min)
 */
export async function startTokenAutoRefresh(intervalMinutes = 1): Promise<boolean> {
  stopTokenAutoRefresh(); // avoid duplicates

  console.log(`🔁 Starting auto-refresh every ${intervalMinutes} min...`);

  // 🔹 Perform an immediate refresh first
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("🔴 Initial refresh failed");
      return false;
    }

    console.log("🟢 Initial token refresh successful");
  } catch (err) {
    console.error("Error during initial refresh:", err);
    return false;
  }

  // 🔹 Then schedule background refresh
  refreshInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        console.log("🟢 Silent token refresh successful");
      } else {
        console.warn("🔴 Refresh failed — tokens might be expired");
        stopTokenAutoRefresh();
      }
    } catch (err) {
      console.error("Error in auto refresh:", err);
      stopTokenAutoRefresh();
    }
  }, intervalMinutes * 60 * 1000);

  return true;
}

/** Stop background refresh (on logout or tab close) */
export function stopTokenAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log("⏹️ Auto-refresh stopped");
  }
}
