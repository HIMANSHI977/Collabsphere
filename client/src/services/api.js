
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  ""
);

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("collabsphere_token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.clone().json().catch(() => ({}));
    if (response.status === 401 && token) {
      localStorage.removeItem("collabsphere_token");
      window.dispatchEvent(new Event("collabsphere:unauthorized"));
    }

    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function apiRequest(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options);
  const data = await response.json().catch(() => ({}));
  return data;
}

export default apiRequest;
