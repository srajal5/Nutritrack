import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "../types";
import { apiRequest, queryClient, getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

/**
 * Drop every cached query and seed the freshly authenticated user. Clearing is
 * what stops one account's entries/goals/stats from showing up for the next.
 */
function resetCacheForUser(user: SelectUser | null) {
  queryClient.clear();
  queryClient.setQueryData(["/api/user"], user);
}

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
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();

      if (!data?.user) {
        throw new Error("No user data received from the server");
      }
      return data.user as SelectUser;
    },
    onSuccess: (loggedInUser: SelectUser) => {
      resetCacheForUser(loggedInUser);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (err: Error) => {
      resetCacheForUser(null);
      toast({
        title: "Login failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<SelectUser, Error, InsertUser>({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      const data = await res.json();

      // The endpoint replies with { user, message } — storing the envelope
      // instead of the user left the app with a user object that had no id.
      if (!data?.user) {
        throw new Error("No user data received from the server");
      }
      return data.user as SelectUser;
    },
    onSuccess: (newUser: SelectUser) => {
      resetCacheForUser(newUser);
      toast({
        title: "Registration successful",
        description: "Welcome to NutriTrack!",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Registration failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      resetCacheForUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (err: Error) => {
      // The server session is likely gone either way — clear locally so the
      // user is not stuck in a half-authenticated UI.
      resetCacheForUser(null);
      toast({
        title: "Logout failed",
        description: err.message,
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
