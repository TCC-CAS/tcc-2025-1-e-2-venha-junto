// frontend/public/js/auth.js
const API_BASE = (function() {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname;
  // Preferência para 127.0.0.1 se for local para evitar problemas de resolução de nome
  return isLocal ? "http://127.0.0.1:8000" : "https://venha-junto-h54n.onrender.com";
})();
console.log("[Auth] API_BASE:", API_BASE);

/**
 * Faz fetch com cookie HttpOnly (credentials: "include")
 */
export async function apiFetch(path, opts = {}) {
  const fullUrl = `${API_BASE}${path}`;
  console.log(`[Auth] Fetching: ${fullUrl}`, opts);
  const res = await fetch(fullUrl, {
    ...opts,
    credentials: "include",
    headers: {
      ...(opts.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && data.detail
        ? data.detail
        : typeof data === "string"
          ? data
          : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return data;
}

/**
 * Retorna o usuário logado via cookie (ou null se não logado)
 */
export async function getCurrentUser() {
  try {
    return await apiFetch("/auth/me");
  } catch {
    return null;
  }
}

/**
 * Exige login de admin e retorna o usuário (ou redireciona)
 */
export async function requireAdmin() {
  const me = await getCurrentUser();

  if (!me) {
    // não logado -> manda pro login admin
    window.location.href = "./admin-login.html";
    return null;
  }

  if (me.role !== "admin") {
    alert("Acesso permitido apenas para administradores.");
    window.location.href = "./index.html";
    return null;
  }

  return me;
}
