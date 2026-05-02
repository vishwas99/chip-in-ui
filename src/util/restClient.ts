import Config from "../config";
import { getAuthData } from "./authService";

const API_BASE_URL = Config.API_BASE_URL;
const LOGIN_CONTEXT = Config.LOGIN_CONTEXT;

console.log("Final API URL:", `${API_BASE_URL}${LOGIN_CONTEXT}`);

// Generic request function
export const request = async (url: string, options: RequestInit = {}) => {
  try {
    console.log(`[API] ${options.method || 'GET'} ${API_BASE_URL}${url}`);
    if (options.body) {
      console.log('[API] Request payload:', options.body);
    }

    const headers: HeadersInit = {
      ...options.headers,
    };

    // Only attach Bearer token for authenticated /api/ routes.
    // Never send auth headers for /auth/ endpoints (login, signup).
    if (url.startsWith('/api/')) {
        const { sessionId: token } = await getAuthData();
        if (token) {
            (headers as any)['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });
    console.log(`[API] Response status: ${response.status}`);

    const text = await response.text();
    console.log('[API] Response body:', text);

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.warn("Response was not JSON, returning text:", e);
      data = text;
    }

    if (!response.ok) {
      throw new Error((data && data.message) || "Something went wrong");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// API Call Examples:
export const login = async (body: any) => {
  return request(`${LOGIN_CONTEXT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};


export default {
  login,
};
