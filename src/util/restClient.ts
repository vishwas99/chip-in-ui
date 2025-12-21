import Config from "../config";

const API_BASE_URL = Config.API_BASE_URL;
const LOGIN_CONTEXT = Config.LOGIN_CONTEXT;

console.log("Final API URL:", `${API_BASE_URL}${LOGIN_CONTEXT}`);

// Generic request function
export const request = async (url: string, options: RequestInit) => {
  try {
    console.log("Making API call to:", `${API_BASE_URL}${url}`);

    const response = await fetch(`${API_BASE_URL}${url}`, options);
    console.log("Response status:", response.status);

    const text = await response.text();
    console.log("Response Text:", text);

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
