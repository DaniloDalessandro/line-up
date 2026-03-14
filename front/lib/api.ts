import { AuthResponse } from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function api(path: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  }

  if (token) {
    ;(headers as any)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && typeof window !== "undefined") {
    // Optionally handle token refresh or redirect to login
    // localStorage.removeItem("access_token")
    // window.location.href = "/login"
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `API error ${res.status}`)
  }
  
  return res.json()
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api("/accounts/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })

  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", data.access)
    localStorage.setItem("refresh_token", data.refresh)
  }

  return data
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    window.location.href = "/login"
  }
}
