"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "mc_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/admin/login";
  }
  return res;
}

export const adminApi = {
  register: (email: string, password: string) =>
    fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password });
    return fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
  },

  getShops: () => adminFetch("/shops"),

  createShop: (data: object) =>
    adminFetch("/shops", { method: "POST", body: JSON.stringify(data) }),

  updateShop: (id: number, data: object) =>
    adminFetch(`/shops/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getProducts: (shopId: number) => adminFetch(`/shops/${shopId}/products`),

  createProduct: (shopId: number, data: object) =>
    adminFetch(`/shops/${shopId}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (shopId: number, productId: number, data: object) =>
    adminFetch(`/shops/${shopId}/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteProduct: (shopId: number, productId: number) =>
    adminFetch(`/shops/${shopId}/products/${productId}`, {
      method: "DELETE",
    }),

  uploadImage: (shopId: number, productId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return adminFetch(`/shops/${shopId}/products/${productId}/image`, {
      method: "POST",
      body: fd,
    });
  },

  getPublications: (shopId: number) =>
    adminFetch(`/shops/${shopId}/publications`),

  getOrders: (shopId: number) => adminFetch(`/shops/${shopId}/orders`),

  updateOrderStatus: (shopId: number, orderId: number, status: string) =>
    adminFetch(`/shops/${shopId}/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  me: () =>
    fetch(`${API}/auth/me`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    }),

  platformOverview: () => adminFetch("/platform/overview"),

  platformShops: () => adminFetch("/platform/shops"),

  platformCreateShop: (data: object) =>
    adminFetch("/platform/shops", { method: "POST", body: JSON.stringify(data) }),

  platformUpdateShop: (id: number, data: object) =>
    adminFetch(`/platform/shops/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
