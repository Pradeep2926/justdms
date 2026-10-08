import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import api, { API_BASE_URL } from "../api/api";
import BioPreview from "../components/bio/BioPreview";

export default function PublicBio() {
  const { username: routeUsername = "" } = useParams();
  const username = routeUsername.replace(/^@/, "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/bio/public/${encodeURIComponent(username)}`).then(({ data }) => setData(data)).catch((err) => setError(err.response?.data?.error || "This bio page is unavailable."));
  }, [username]);
  if (!data && !error) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center"><div><h1 className="text-2xl font-bold text-slate-950">Page not available</h1><p className="mt-2 text-slate-500">{error}</p></div></div>;
  return <BioPreview profile={data.profile} links={data.links} interactive fullPage apiBaseUrl={API_BASE_URL} />;
}
