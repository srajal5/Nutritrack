import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Tracker from "./pages/Tracker";
import AICoach from "./pages/AICoach";
import Stats from "./pages/Stats";
import CookieConsent from "./components/CookieConsent";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeDemo } from "./components/ThemeDemo";
import BackButtonTest from "./components/BackButtonTest";
import ThemeTest from "./components/ThemeTest";
import ThemeTestPage from "./pages/ThemeTestPage";
import { setupEnhancedHMR } from "./lib/hot-reload";
import { initDevFeatures } from "./lib/dev-config";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/theme-demo" component={ThemeDemo} />
      <Route path="/back-button-test" component={BackButtonTest} />
      <Route path="/theme-test" component={ThemeTest} />
      <Route path="/theme-test-page" component={ThemeTestPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/tracker" component={Tracker} />
      <ProtectedRoute path="/ai-coach" component={AICoach} />
      <ProtectedRoute path="/stats" component={Stats} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Setup enhanced hot reload and development features
  if (import.meta.env.DEV) {
    setupEnhancedHMR();
    initDevFeatures();
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="nutritrack-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
          <CookieConsent />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
