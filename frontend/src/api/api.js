import axios from "axios";

const isProductionDomain =
  typeof window !== "undefined" &&
  ["justdms.in", "www.justdms.in"].includes(window.location.hostname);
const configuredApiUrl = import.meta.env.VITE_API_URL;
const isLocalApiUrl =
  configuredApiUrl?.includes("localhost") ||
  configuredApiUrl?.includes("127.0.0.1");
const productionApiUrl = isProductionDomain ? "https://api.justdms.in" : null;

export const API_BASE_URL =
  productionApiUrl && isLocalApiUrl
    ? productionApiUrl
    : configuredApiUrl || productionApiUrl || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
