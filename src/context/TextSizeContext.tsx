import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface TextSizeContextValue {
  scale: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

const MIN_SCALE = 0.85;
const MAX_SCALE = 1.4;
const STEP = 0.1;
const STORAGE_KEY = "flowinsight_text_scale";

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState<number>(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    return guardado ? Number(guardado) : 1;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(scale));
  }, [scale]);

  const increase = () => setScale((s) => Math.min(MAX_SCALE, +(s + STEP).toFixed(2)));
  const decrease = () => setScale((s) => Math.max(MIN_SCALE, +(s - STEP).toFixed(2)));
  const reset = () => setScale(1);

  return (
    <TextSizeContext.Provider value={{ scale, increase, decrease, reset }}>
      <div style={{ zoom: scale }}>
        {children}
      </div>
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error("useTextSize debe usarse dentro de TextSizeProvider");
  return ctx;
}