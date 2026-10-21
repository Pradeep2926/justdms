import { useEffect, useState } from "react";
import api from "../api/api";

export function useAdminAccess(user) {
  const [allowedUserId, setAllowedUserId] = useState(null);
  useEffect(() => {
    let active = true;
    if (user?.id) {
      api.get("/admin/access").then(({ data }) => {
        if (active && data.isAdmin) setAllowedUserId(user.id);
      }).catch(() => { if (active) setAllowedUserId(null); });
    }
    return () => { active = false; };
  }, [user?.id]);
  return Boolean(user?.id && allowedUserId === user.id);
}
