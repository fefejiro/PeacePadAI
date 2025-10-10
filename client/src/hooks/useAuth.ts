import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      // Return null on 401 (not authenticated) - this is a valid state, not an error
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        // Still return null instead of throwing - auth errors shouldn't show to user
        console.error("Auth check failed:", res.status, res.statusText);
        return null;
      }
      
      return await res.json();
    },
    retry: false, // Don't retry - 401 is a valid state
    meta: {
      // Prevent React Query devtools or error boundaries from showing this
      suppressErrors: true,
    },
  });

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
