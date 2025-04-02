const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const LOGIN_CONTEXT = process.env.EXPO_PUBLIC_LOGIN_CONTEXT || "/login";

console.log("Final API URL:", `${API_BASE_URL}${LOGIN_CONTEXT}`);

// Generic request function
const request = async (url: string, options: RequestInit) => {
  try {
    console.log("Making API call to:", `${API_BASE_URL}${url}`);
    
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    console.log("Response status:", response.status);
    
    const data = await response.json();
    console.log("Response Data:", data);

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
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
