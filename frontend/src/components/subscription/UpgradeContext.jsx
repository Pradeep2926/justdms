import { createContext, useContext } from "react";
export const UpgradeContext = createContext(null);
export function useUpgrade() { return useContext(UpgradeContext); }
