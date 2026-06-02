"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type FogCtx = { enabled: boolean; toggle: () => void };

const FogContext = createContext<FogCtx | null>(null);
const STORAGE_KEY = "fog-bg-enabled";

export function FogProvider({ children }: { children: ReactNode }) {
  // Default on; server renders this, then we hydrate the saved preference.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setEnabled(saved === "1");
  }, []);

  const toggle = () =>
    setEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* private mode / storage disabled — preference just won't persist */
      }
      return next;
    });

  return (
    <FogContext.Provider value={{ enabled, toggle }}>
      {children}
    </FogContext.Provider>
  );
}

export function useFog() {
  const ctx = useContext(FogContext);
  if (!ctx) throw new Error("useFog must be used within FogProvider");
  return ctx;
}
