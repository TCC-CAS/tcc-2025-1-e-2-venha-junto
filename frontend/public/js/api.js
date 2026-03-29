const API_BASE = (function() {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || !window.location.hostname;
  return isLocal ? "http://127.0.0.1:8000" : "https://venha-junto-h54n.onrender.com";
})();

window.API_BASE = API_BASE;
console.log("[API] Base URL configurada para:", API_BASE);

/**
 * Upload de fotos para o estabelecimento
 */
window.apiUploadPlacePhoto = async (estabId, file, isProfile = false) => {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint = isProfile 
    ? `/api/estabelecimentos/${estabId}/foto-perfil`
    : `/api/estabelecimentos/${estabId}/galeria`;

  console.log(`[API] Uploading photo (${isProfile ? 'perfil' : 'galeria'}) to: ${API_BASE}${endpoint}`);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Erro no upload da foto");
  }

  return res.json();
};

/**
 * ✅ Converte qualquer tipo de erro em mensagem legível (string)
 */
function extractErrorMessage(data, resStatus) {
  try {
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object") {
      if (typeof data.detail === "string" && data.detail.trim())
        return data.detail.trim();
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        const first = data.detail[0];
        if (typeof first === "string" && first.trim()) return first.trim();
        if (first && typeof first === "object") {
          return first.msg || JSON.stringify(data.detail);
        }
      }
      return data.message || JSON.stringify(data);
    }
    return `Erro ${resStatus}`;
  } catch (e) {
    return `Erro ${resStatus}`;
  }
}

/**
 * Request padrão com logs de debug
 */
async function request(path, { method = "GET", body = null } = {}) {
  const fullUrl = `${API_BASE}${path}`;
  console.log(`[API] ${method} ${fullUrl}`);

  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      credentials: "include",
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      console.error(`[API Error] ${res.status} ${res.statusText} em ${fullUrl}`, data);
      const msg = extractErrorMessage(data, res.status);
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    console.error(`[API Network Error] Falha crítica ao acessar ${fullUrl}:`, err);
    
    if (err.message === "Failed to fetch") {
      const msg = `Não foi possível conectar ao servidor (${API_BASE}). 
Assunções comuns:
1. O backend não está rodando.
2. O backend está rodando em outra porta/endereço.
3. Bloqueio de CORS (verifique o console F12 para detalhes).
4. Firewall ou Extensão do navegador bloqueando a requisição.`;
      throw new Error(msg);
    }
    throw err;
  }
}

/* =========================
   USER (cookie vj_access_token)
========================= */
window.apiRegister = (payload) =>
  request("/api/usuarios/cadastro", { method: "POST", body: payload });

window.apiLogin = (payload) =>
  request("/api/usuarios/login", { method: "POST", body: payload });

window.apiMe = () => request("/api/usuarios/me", { method: "GET" });
window.apiLogout = () => request("/api/usuarios/logout", { method: "POST" });
window.apiUserMe = () => request("/api/usuarios/me", { method: "GET" });
window.apiUserUpdateMe = (payload) =>
  request("/api/usuarios/me", { method: "PUT", body: payload });
window.apiUserDeleteMe = () =>
  request("/api/usuarios/me", { method: "DELETE" });

/* =========================
   PARTNER AUTH (cookie vj_partner_token)
========================= */
window.apiPartnerRegister = (payload) =>
  request("/partner-auth/register", { method: "POST", body: payload });

window.apiPartnerLogin = (payload) =>
  request("/partner-auth/login", { method: "POST", body: payload });

window.apiPartnerMe = () => request("/partner-auth/me", { method: "GET" });
window.apiPartnerUpdateMe = (payload) =>
  request("/partner-auth/me", { method: "PATCH", body: payload });
window.apiPartnerLogout = () =>
  request("/partner-auth/logout", { method: "POST" });

/* =========================
   PARTNER ROUTES (estabelecimentos)
========================= */
window.apiPartnerCreatePlace = (payload) =>
  request("/api/estabelecimentos", { method: "POST", body: payload });

window.apiPartnerListMyPlaces = () =>
  request("/api/estabelecimentos", { method: "GET" });

window.apiPartnerGetPlace = (placeId) =>
  request(`/api/estabelecimentos/${placeId}`, { method: "GET" });

/* =========================
   ADMIN (cookie vj_access_token role=admin)
========================= */
window.apiAdminListPlaces = (status = "PENDING_REVIEW") =>
  request(`/api/admin/estabelecimentos?status=${encodeURIComponent(status)}`, {
    method: "GET",
  });

window.apiAdminApprovePlace = (placeId) =>
  request(`/api/admin/estabelecimentos/${placeId}/approve`, { method: "POST" });

window.apiAdminRejectPlace = (placeId) =>
  request(`/api/admin/estabelecimentos/${placeId}/reject`, { method: "POST" });

/* =========================
   PUBLIC
========================= */
window.apiPublicPlaces = ({
  cidade = null,
  tipo = null,
  verified_first = true,
} = {}) => {
  const qs = new URLSearchParams();
  if (cidade) qs.set("cidade", cidade);
  if (tipo && tipo !== "Todos") qs.set("tipo", tipo);
  qs.set("verified_first", String(verified_first));
  return request(`/public/places?${qs.toString()}`, { method: "GET" });
};

window.apiPublicPlaceDetails = (placeId) =>
  request(`/public/places/${placeId}`, { method: "GET" });
