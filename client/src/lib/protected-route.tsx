import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading: authLoading } = useAuth();
  
  // Also fetch the user profile to check onboarding status
  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/user-profile"],
    enabled: !!user,
  });

  const isLoading = authLoading || (!!user && profileLoading);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect to onboarding if not completed and not already on the onboarding page
  const needsOnboarding = profile === null || (profile && !profile.isCompleted);
  if (needsOnboarding && path !== "/onboarding") {
    return (
      <Route path={path}>
        <Redirect to="/onboarding" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}