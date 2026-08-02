import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Verify() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleVerify = async () => {
      try {
        // 1️⃣ Read tokens from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          console.error("❌ Missing auth tokens");
          return;
        }

        // 2️⃣ Set Supabase session
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("❌ Session error:", error.message);
          return;
        }

        const user = data?.user;

        if (!user) {
          console.error("❌ No user returned from session");
          return;
        }

        console.log("✅ User verified:", user.id);

        // 3️⃣ Store user_id locally (optional)
        localStorage.setItem("user_id", user.id);

        // 4️⃣ Restore pending profile
        const pendingProfile = JSON.parse(
          localStorage.getItem("pendingProfile") || "{}"
        );

        // 5️⃣ Insert / Update profile (UPSERT)
        if (pendingProfile && user.email) {
          const { error: upsertError } = await supabase
            .from("ProfileUsers")
            .upsert(
              {
                id: user.id, // must match auth.uid()
                FirstName: pendingProfile.firstName || null,
                LastName: pendingProfile.lastName || null,
                Mobile: pendingProfile.mobile || null,
                Email: user.email,
              },
              {
                onConflict: "id", // explicit conflict column
              }
            );

          if (upsertError) {
            console.error("❌ Profile UPSERT failed:", upsertError);
            return;
          }

          console.log("✅ Profile saved to Supabase");
          localStorage.removeItem("pendingProfile");
        }

        // 6️⃣ Clean URL & redirect
        window.history.replaceState({}, "", "/verify");
        navigate("/connect-meta", { replace: true });
      } catch (err) {
        console.error("❌ Verify flow crashed:", err);
      }
    };

    handleVerify();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg font-medium">Verifying your email…</p>
    </div>
  );
}
