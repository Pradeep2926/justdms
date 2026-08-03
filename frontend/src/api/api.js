import axios from "axios";

const productionApiUrl =
  typeof window !== "undefined" &&
  ["justdms.in", "www.justdms.in"].includes(window.location.hostname)
    ? "https://api.justdms.in"
    : null;

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || productionApiUrl || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
