"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed bottom-6 right-6 p-3 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all z-50 text-slate-800 dark:text-slate-200 flex items-center justify-center hover:scale-110 active:scale-95"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
