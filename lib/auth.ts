"use client";
export async function clearToken() {
  const response = await fetch("/api/session", {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Unable to sign out. Try again.");
  try {
    window.localStorage.removeItem("pageradar_token");
  } catch {
    /* storage may be disabled */
  }
}
export function clearLegacyToken() {
  try {
    window.localStorage.removeItem("pageradar_token");
  } catch {
    /* storage may be disabled */
  }
}
