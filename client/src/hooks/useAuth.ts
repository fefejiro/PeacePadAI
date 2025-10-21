import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        return null;
      }
      
      return await res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = () => {
    window.location.href = '/api/login';
  };

  const logout = () => {
    queryClient.setQueryData(['/api/auth/user'], null);
    window.location.href = '/api/logout';
  };

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
