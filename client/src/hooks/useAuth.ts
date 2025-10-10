import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      console.log("[useAuth] Fetching auth status...");
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      console.log("[useAuth] Response status:", res.status);
      
      // Return null on 401 (not authenticated) - this is a valid state, not an error
      if (res.status === 401) {
        console.log("[useAuth] Not authenticated (401)");
        return null;
      }
      
      if (!res.ok) {
        // Still return null instead of throwing - auth errors shouldn't show to user
        console.error("[useAuth] Auth check failed:", res.status, res.statusText);
        return null;
      }
      
      const data = await res.json();
      // Server returns { user, sessionId }, we only need the user
      const user = data.user || null;
      console.log("[useAuth] User authenticated:", user);
      return user;
    },
    staleTime: 0, // Always refetch - auth state must be fresh
    retry: false, // Don't retry - 401 is a valid state
    meta: {
      // Prevent React Query devtools or error boundaries from showing this
      suppressErrors: true,
    },
  });

  console.log("[useAuth] Current state - isAuthenticated:", !!user, "isLoading:", isLoading);

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
