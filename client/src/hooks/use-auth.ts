import { useState, useEffect } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize from localStorage immediately
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("sessionToken");
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verify authentication state on mount/refresh
    const sessionToken = localStorage.getItem("sessionToken");
    setIsAuthenticated(!!sessionToken);
  }, []);

  const login = async (token: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("sessionToken", data.sessionToken);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("sessionToken");
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, login, logout };
}
