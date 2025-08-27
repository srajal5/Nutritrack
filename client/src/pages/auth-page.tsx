import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import BackButton from "../components/BackButton";
import { motion } from "framer-motion";
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield, 
  TrendingUp, 
  Target,
  Sparkles,
  CheckCircle
} from "lucide-react";

// Define the insert user schema locally since shared schema was removed
const insertUserSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Handle navigation using useEffect
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Analysis",
      description: "Get accurate nutritional information with our advanced AI technology."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Smart Goal Tracking",
      description: "Set and achieve your nutrition goals with personalized insights."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Progress Visualization",
      description: "Track your journey with beautiful charts and detailed analytics."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <BackButton showHome={true} />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen gap-8">
          {/* Auth Form Section */}
          <motion.div 
            className="w-full max-w-md"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="card bg-base-100 shadow-2xl">
              <div className="card-body p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="avatar placeholder mb-4">
                    <div className="bg-primary text-primary-content rounded-full w-16">
                      <span className="text-2xl">🍎</span>
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-base-content mb-2">
                    NutriTrack
                  </h1>
                  <p className="text-base-content/70">
                    {activeTab === "login" 
                      ? "Welcome back! Sign in to continue your journey" 
                      : "Join us and start tracking your nutrition today"
                    }
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="tabs tabs-boxed bg-base-200 p-1 mb-6">
                  <button 
                    className={`tab flex-1 ${activeTab === "login" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("login")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </button>
                  <button 
                    className={`tab flex-1 ${activeTab === "register" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("register")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Register
                  </button>
                </div>

                {/* Login Form */}
                {activeTab === "login" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      {/* Username Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Username
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your username"
                          className={`input input-bordered w-full ${loginForm.formState.errors.username ? 'input-error' : ''}`}
                          {...loginForm.register("username")}
                          autoComplete="username"
                        />
                        {loginForm.formState.errors.username && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {loginForm.formState.errors.username.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Password Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Password
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className={`input input-bordered w-full pr-12 ${loginForm.formState.errors.password ? 'input-error' : ''}`}
                            {...loginForm.register("password")}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-base-content/50" />
                            ) : (
                              <Eye className="h-4 w-4 text-base-content/50" />
                            )}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {loginForm.formState.errors.password.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className={`btn btn-primary w-full ${loginMutation.isPending ? 'loading' : ''}`}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          "Signing in..."
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Sign In
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Register Form */}
                {activeTab === "register" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      {/* Username Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Username
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="Choose a username"
                          className={`input input-bordered w-full ${registerForm.formState.errors.username ? 'input-error' : ''}`}
                          {...registerForm.register("username")}
                          autoComplete="username"
                        />
                        {registerForm.formState.errors.username && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {registerForm.formState.errors.username.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Email Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </span>
                        </label>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          className={`input input-bordered w-full ${registerForm.formState.errors.email ? 'input-error' : ''}`}
                          {...registerForm.register("email")}
                          autoComplete="email"
                        />
                        {registerForm.formState.errors.email && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {registerForm.formState.errors.email.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Password Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Password
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className={`input input-bordered w-full pr-12 ${registerForm.formState.errors.password ? 'input-error' : ''}`}
                            {...registerForm.register("password")}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-base-content/50" />
                            ) : (
                              <Eye className="h-4 w-4 text-base-content/50" />
                            )}
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {registerForm.formState.errors.password.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Confirm Password Field */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Confirm Password
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className={`input input-bordered w-full pr-12 ${registerForm.formState.errors.confirmPassword ? 'input-error' : ''}`}
                            {...registerForm.register("confirmPassword")}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-base-content/50" />
                            ) : (
                              <Eye className="h-4 w-4 text-base-content/50" />
                            )}
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <label className="label">
                            <span className="label-text-alt text-error">
                              {registerForm.formState.errors.confirmPassword.message}
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className={`btn btn-primary w-full ${registerMutation.isPending ? 'loading' : ''}`}
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          "Creating account..."
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Create Account
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Hero Section */}
          <motion.div 
            className="w-full max-w-2xl text-center lg:text-left"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="card bg-gradient-to-br from-primary to-primary-focus text-primary-content shadow-2xl">
              <div className="card-body p-12">
                <h2 className="card-title text-4xl font-bold mb-6 justify-center lg:justify-start">
                  Track Your Nutrition Journey
                </h2>
                <p className="text-xl mb-8 opacity-90">
                  NutriTrack helps you monitor your daily food intake, analyze
                  nutritional content with AI, and get personalized recommendations
                  for a healthier lifestyle.
                </p>
                
                {/* Features Grid */}
                <div className="grid gap-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    >
                      <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                        {feature.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                        <p className="opacity-90">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Call to Action */}
                <div className="mt-8">
                  <button 
                    className="btn btn-outline btn-accent btn-lg"
                    onClick={() => setActiveTab("register")}
                  >
                    Get Started Today
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}