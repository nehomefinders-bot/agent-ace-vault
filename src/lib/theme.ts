export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function isDarkTheme(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = isDarkTheme(theme);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.theme = theme;
}

export function getThemeBootstrapScript() {
  return `(() => {
    try {
      const theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system";
      const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      const root = document.documentElement;
      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
      root.dataset.theme = theme;
    } catch (e) {}
  })();`;
}

export function createThemeSync() {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(getStoredTheme());
    }
  };
  const onSystemChange = () => {
    if (getStoredTheme() === "system") {
      applyTheme("system");
    }
  };

  window.addEventListener("storage", onStorage);
  if ("addEventListener" in media) {
    media.addEventListener("change", onSystemChange);
  } else {
    media.addListener(onSystemChange);
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    if ("removeEventListener" in media) {
      media.removeEventListener("change", onSystemChange);
    } else {
      media.removeListener(onSystemChange);
    }
  };
}
