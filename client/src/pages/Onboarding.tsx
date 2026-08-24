import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { motion } from "framer-motion";
import { Target, Activity, Dumbbell, Utensils, CheckCircle, ArrowRight, ArrowLeft, Loader2, Wand2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const GOALS = [
  { id: "LOSE_WEIGHT", label: "Lose Weight", icon: <Target className="w-6 h-6" /> },
  { id: "GAIN_WEIGHT", label: "Gain Weight", icon: <Activity className="w-6 h-6" /> },
  { id: "BUILD_MUSCLE", label: "Build Muscle", icon: <Dumbbell className="w-6 h-6" /> },
  { id: "MAINTAIN_WEIGHT", label: "Maintain Weight", icon: <CheckCircle className="w-6 h-6" /> },
  { id: "IMPROVE_FITNESS", label: "Improve Fitness", icon: <Activity className="w-6 h-6" /> },
  { id: "IMPROVE_NUTRITION", label: "Improve Nutrition", icon: <Utensils className="w-6 h-6" /> },
  { id: "GENERAL_HEALTH", label: "General Health", icon: <CheckCircle className="w-6 h-6" /> }
];

const ACTIVITY_LEVELS = [
  { id: "SEDENTARY", label: "Sedentary", description: "Little to no exercise" },
  { id: "LIGHT", label: "Lightly Active", description: "Light exercise 1-3 days/week" },
  { id: "MODERATE", label: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
  { id: "ACTIVE", label: "Very Active", description: "Hard exercise 6-7 days/week" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [profileData, setProfileData] = useState({
    goal: { primaryGoal: "" },
    profile: {
      age: "",
      heightCm: "",
      weightKg: "",
      targetWeightKg: "",
      activityLevel: "MODERATE",
    },
    workout: {
      daysPerWeek: 3,
      location: "HOME",
    },
    nutrition: {
      dietaryPreference: "NO_RESTRICTION",
    }
  });

  const { data: existingProfile, isLoading: isLoadingProfile } = useQuery<any>({
    queryKey: ["/api/user-profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (existingProfile && existingProfile.isCompleted) {
      navigate("/dashboard");
    }
  }, [existingProfile, navigate]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/user-profile", {
        ...data,
        isCompleted: true
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      toast({
        title: "Profile saved",
        description: "Your personalized plan has been set up!",
      });
      navigate("/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile.",
        variant: "destructive"
      });
    }
  });

  const generatePlanMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/user-profile/generate-plan", { prompt });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.isComplete) {
        toast({
          title: "Need more information",
          description: data.followUpQuestion || "Please provide more details.",
        });
        // Add follow-up logic if needed, or just let user answer
      } else {
        // Save the generated plan
        saveMutation.mutate(data);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI plan.",
        variant: "destructive"
      });
    }
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleManualSave = () => {
    // Generate some default targets if manual
    const dataToSave = {
      ...profileData,
      profile: {
        ...profileData.profile,
        age: Number(profileData.profile.age),
        heightCm: Number(profileData.profile.heightCm),
        weightKg: Number(profileData.profile.weightKg),
        targetWeightKg: Number(profileData.profile.targetWeightKg),
      },
      nutrition: {
        ...profileData.nutrition,
        calorieTarget: 2000,
        proteinTarget: 150
      }
    };
    saveMutation.mutate(dataToSave);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome to NutriTrack</h1>
          <p className="text-muted-foreground mt-2">Let's set up your personalized profile</p>
        </div>

        <Card className="shadow-lg border-border">
          {!isAiMode ? (
            <>
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CardHeader>
                    <CardTitle>What is your main goal?</CardTitle>
                    <CardDescription>Select one primary fitness goal</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {GOALS.map(goal => (
                      <div
                        key={goal.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          profileData.goal.primaryGoal === goal.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setProfileData({ ...profileData, goal: { primaryGoal: goal.id } })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-primary">{goal.icon}</div>
                          <span className="font-medium text-foreground">{goal.label}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => setIsAiMode(true)}>
                      <Wand2 className="w-4 h-4 mr-2" /> Set Up With AI
                    </Button>
                    <Button 
                      disabled={!profileData.goal.primaryGoal} 
                      onClick={nextStep}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CardHeader>
                    <CardTitle>Tell us about yourself</CardTitle>
                    <CardDescription>This helps us calculate your specific needs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input
                          type="number"
                          value={profileData.profile.age}
                          onChange={e => setProfileData({
                            ...profileData, 
                            profile: { ...profileData.profile, age: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (cm)</Label>
                        <Input
                          type="number"
                          value={profileData.profile.heightCm}
                          onChange={e => setProfileData({
                            ...profileData, 
                            profile: { ...profileData.profile, heightCm: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Weight (kg)</Label>
                        <Input
                          type="number"
                          value={profileData.profile.weightKg}
                          onChange={e => setProfileData({
                            ...profileData, 
                            profile: { ...profileData.profile, weightKg: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Weight (kg)</Label>
                        <Input
                          type="number"
                          value={profileData.profile.targetWeightKg}
                          onChange={e => setProfileData({
                            ...profileData, 
                            profile: { ...profileData.profile, targetWeightKg: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button 
                      disabled={!profileData.profile.age || !profileData.profile.weightKg} 
                      onClick={nextStep}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CardHeader>
                    <CardTitle>How active are you?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ACTIVITY_LEVELS.map(level => (
                      <div
                        key={level.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          profileData.profile.activityLevel === level.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setProfileData({ 
                          ...profileData, 
                          profile: { ...profileData.profile, activityLevel: level.id } 
                        })}
                      >
                        <div className="font-medium text-foreground">{level.label}</div>
                        <div className="text-sm text-muted-foreground">{level.description}</div>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button onClick={handleManualSave} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Finish Setup
                    </Button>
                  </CardFooter>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" /> AI Coach Setup
                </CardTitle>
                <CardDescription>
                  Tell me what you want to achieve in natural language.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="w-full h-32 resize-none"
                  placeholder="E.g., I want to lose 5kg in 3 months, work out 5 days a week at home, and eat more protein."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => setIsAiMode(false)}>
                  Manual Setup
                </Button>
                <Button 
                  onClick={() => generatePlanMutation.mutate(aiPrompt)}
                  disabled={!aiPrompt || generatePlanMutation.isPending}
                >
                  {generatePlanMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    "Generate My Plan"
                  )}
                </Button>
              </CardFooter>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
