import { useEffect, useState } from "react";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | null>(
    "light"
  );

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Get the initial color scheme
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setColorScheme(mediaQuery.matches ? "dark" : "light");

      // Listen for changes
      const handleChange = (e: MediaQueryListEvent) => {
        setColorScheme(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      setHasHydrated(true);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, []);

  // Return light theme during SSR or before hydration
  if (!hasHydrated) {
    return "light";
  }

  return colorScheme;
}
