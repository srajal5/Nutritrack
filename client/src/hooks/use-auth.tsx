import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "../types";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "../lib/queryClient";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch user data with credentials
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log('Attempting login with credentials:', {
          username: credentials.username,
          password: '[REDACTED]'
        });

        const res = await apiRequest("POST", "/api/login", credentials);
        console.log('Login response received:', {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });

        const data = await res.json();
        console.log('Login data received:', {
          hasUser: !!data.user,
          sessionID: data.sessionID
        });
        
        if (!data.user) {
          throw new Error('No user data received');
        }

        return data.user;
      } catch (error) {
        console.error('Login error details:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          status: error instanceof Error && 'status' in error ? (error as any).status : undefined
        });
        
        // If it's an API error, use its message
        if (error instanceof Error && 'data' in error) {
          const apiError = error as { data: { message: string } };
          throw new Error(apiError.data.message || 'Login failed');
        }
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log('Login successful:', {
        userId: user.id,
        username: user.username
      });

      // Clear all existing queries
      queryClient.clear();
      
      // Set the new user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate and refetch any necessary queries
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-goals"] });
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', {
        message: error.message,
        stack: error.stack
      });

      // Clear user data on error
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all queries
      queryClient.clear();
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
    retry: 1,
    retryDelay: 1000,
  });

  const registerMutation = useMutation<SelectUser, Error, InsertUser>({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: "Welcome to NutriTrack!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/food-entries"] });
      queryClient.removeQueries({ queryKey: ["/api/nutrition-goals"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}