import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Verify() {
  const navigate = useNavigate();

  useEffect(() => {
    async function completeLogin() {
      const { data } = await supabase.auth.getSession();

      if (!data?.session) return;

      const pending = JSON.parse(
        localStorage.getItem("pendingProfile") || "{}"
      );

      if (pending?.email) {
        await supabase.from("ProfileUsers").upsert({
          id: data.session.user.id,
          FirstName: pending.firstName,
          LastName: pending.lastName,
          Mobile: pending.mobile,
          Email: pending.email,
        });

        localStorage.removeItem("pendingProfile");
      }

      navigate("/dashboard", { replace: true });
    }

    completeLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg font-medium">Verifying your email…</p>
    </div>
  );
}
