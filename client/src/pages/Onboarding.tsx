import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn, ApiError } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { motion } from "framer-motion";
import { Target, Activity, Dumbbell, Utensils, CheckCircle, ArrowRight, ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type {
  ActivityLevel, BiologicalSex, DietaryPreference, FitnessLevel, PrimaryGoal, WorkoutLocation,
} from "@shared/types";

const GOALS: { id: PrimaryGoal; label: string; blurb: string; icon: JSX.Element }[] = [
  { id: "LOSE_WEIGHT", label: "Lose Weight", blurb: "Sustainable calorie deficit", icon: <Target className="w-5 h-5" /> },
  { id: "BUILD_MUSCLE", label: "Build Muscle", blurb: "Surplus with high protein", icon: <Dumbbell className="w-5 h-5" /> },
  { id: "BODY_RECOMPOSITION", label: "Build Muscle & Lose Fat", blurb: "Recomposition at maintenance", icon: <Activity className="w-5 h-5" /> },
  { id: "GAIN_WEIGHT", label: "Gain Weight", blurb: "Steady calorie surplus", icon: <Activity className="w-5 h-5" /> },
  { id: "MAINTAIN_WEIGHT", label: "Maintain Weight", blurb: "Hold steady at maintenance", icon: <CheckCircle className="w-5 h-5" /> },
  { id: "IMPROVE_FITNESS", label: "Improve Fitness", blurb: "Endurance and stamina", icon: <Activity className="w-5 h-5" /> },
  { id: "IMPROVE_NUTRITION", label: "Eat Better", blurb: "Food quality and balance", icon: <Utensils className="w-5 h-5" /> },
  { id: "GENERAL_HEALTH", label: "General Health", blurb: "Balanced all-round plan", icon: <CheckCircle className="w-5 h-5" /> },
];

const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; description: string }[] = [
  { id: "SEDENTARY", label: "Sedentary", description: "Desk job, little or no exercise" },
  { id: "LIGHT", label: "Lightly Active", description: "Light exercise 1-3 days/week" },
  { id: "MODERATE", label: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
  { id: "ACTIVE", label: "Very Active", description: "Hard exercise 6-7 days/week" },
  { id: "VERY_ACTIVE", label: "Athlete", description: "Twice-daily training or physical job" },
];

const FITNESS_LEVELS: { id: FitnessLevel; label: string }[] = [
  { id: "BEGINNER", label: "Beginner" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" },
];

const DIETS: { id: DietaryPreference; label: string }[] = [
  { id: "NO_RESTRICTION", label: "No restriction" },
  { id: "VEGETARIAN", label: "Vegetarian" },
  { id: "VEGAN", label: "Vegan" },
  { id: "EGGETARIAN", label: "Eggetarian" },
  { id: "PESCATARIAN", label: "Pescatarian" },
  { id: "HALAL", label: "Halal" },
  { id: "KOSHER", label: "Kosher" },
];

const LOCATIONS: { id: WorkoutLocation; label: string }[] = [
  { id: "HOME", label: "Home" },
  { id: "GYM", label: "Gym" },
  { id: "OUTDOOR", label: "Outdoors" },
  { id: "MIXED", label: "Mixed" },
];

const EQUIPMENT = ["Dumbbells", "Barbell", "Resistance bands", "Pull-up bar", "Kettlebell", "Machines", "Bodyweight only"];

const TOTAL_STEPS = 5;

/** Split a comma-separated field into clean terms. */
function parseList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);

  const [goal, setGoal] = useState<PrimaryGoal | "">("");
  const [goalDescription, setGoalDescription] = useState("");
  const [age, setAge] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">("");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightKg, setWeightKg] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | "">("");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [location, setLocation] = useState<WorkoutLocation>("HOME");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>("NO_RESTRICTION");
  const [allergies, setAllergies] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [preferredFoods, setPreferredFoods] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("3");

  const { data: existingProfile, isLoading: isLoadingProfile } = useQuery<any>({
    queryKey: ["/api/user-profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    retry: false,
  });

  // Only skip onboarding when a usable plan actually exists. A profile marked
  // complete but with no plan still needs finishing, otherwise the dashboard
  // would have nothing real to show.
  useEffect(() => {
    if (existingProfile?.resolvedPlan) navigate("/dashboard");
  }, [existingProfile, navigate]);

  /** Interpret the user's own wording; it pre-selects a goal but never fills in measurements. */
  const interpretMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/user-profile/interpret-goal", { text });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.interpretedGoal) {
        setGoal(data.interpretedGoal);
        toast({ title: "Goal understood", description: data.message });
      } else {
        toast({ title: "Pick the closest goal", description: data.message });
      }
    },
    onError: () => toast({ title: "Couldn't interpret that", description: "Please choose a goal below.", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profile: {
          age: Number(age),
          biologicalSex,
          height: Number(height),
          heightUnit,
          weightKg: Number(weightKg),
          ...(targetWeightKg ? { targetWeightKg: Number(targetWeightKg) } : {}),
          activityLevel,
          fitnessLevel,
        },
        goal: {
          primaryGoal: goal,
          ...(goalDescription.trim() ? { goalDescription: goalDescription.trim() } : {}),
        },
        workout: { daysPerWeek: Number(daysPerWeek), location, equipment },
        nutrition: {
          dietaryPreference,
          allergies: parseList(allergies),
          dislikedFoods: parseList(dislikedFoods),
          preferredFoods: parseList(preferredFoods),
          mealsPerDay: Number(mealsPerDay),
        },
      };
      const res = await apiRequest("PUT", "/api/user-profile", payload);
      return res.json();
    },
    // Redirect only after the write has succeeded and caches are refreshed,
    // so the dashboard never renders before the plan exists.
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      await queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/dashboard/"),
      });
      toast({
        title: "Your plan is ready",
        description: `${data.plan.targets.calories} kcal and ${data.plan.targets.proteinGrams}g protein per day.`,
      });
      navigate("/dashboard");
    },
    onError: (err: Error) => {
      const fields = err instanceof ApiError ? err.missingFields : [];
      setErrors(fields.length ? [`${err.message} (${fields.join(", ")})`] : [err.message]);
      toast({ title: "Couldn't create your plan", description: err.message, variant: "destructive" });
    },
  });

  /** Per-step validation. Nothing is defaulted on the user's behalf. */
  function validateStep(current: number): string[] {
    const problems: string[] = [];
    if (current === 1 && !goal) problems.push("Choose your main goal.");
    if (current === 2) {
      const a = Number(age);
      if (!age || !Number.isFinite(a) || a < 13 || a > 100) problems.push("Enter your age (13-100).");
      if (!biologicalSex) problems.push("Select your biological sex — it changes the calorie calculation.");
      const h = Number(height);
      if (!height || !Number.isFinite(h) || h <= 0) problems.push("Enter your height.");
      else if (heightUnit === "cm" && (h < 120 || h > 250)) problems.push("Height in cm should be between 120 and 250.");
      else if (heightUnit === "ft" && (h < 3.5 || h > 8)) problems.push("Height in feet should be between 3.5 and 8.");
      const w = Number(weightKg);
      if (!weightKg || !Number.isFinite(w) || w < 30 || w > 300) problems.push("Enter your weight in kg (30-300).");
      if (targetWeightKg) {
        const tw = Number(targetWeightKg);
        if (!Number.isFinite(tw) || tw < 30 || tw > 300) problems.push("Target weight should be between 30 and 300 kg.");
      }
    }
    if (current === 3) {
      if (!activityLevel) problems.push("Select your activity level.");
      if (!fitnessLevel) problems.push("Select your fitness level.");
    }
    if (current === 5) {
      const m = Number(mealsPerDay);
      if (!Number.isFinite(m) || m < 1 || m > 8) problems.push("Meals per day should be between 1 and 8.");
    }
    return problems;
  }

  function goNext() {
    const problems = validateStep(step);
    setErrors(problems);
    if (problems.length === 0) setStep((s) => s + 1);
  }

  function submit() {
    // Re-check every step, not just this one, so nothing skipped slips through.
    const stepsToCheck = [1, 2, 3, 5];
    const problems = stepsToCheck.flatMap(validateStep);
    setErrors(problems);

    if (problems.length > 0) {
      toast({
        title: "Some details are missing",
        description:
          "To create an accurate personalized plan, please provide your age, height, weight and activity level.",
        variant: "destructive",
      });
      // Jump back to the earliest step that still has a problem.
      const firstBadStep = stepsToCheck.find((s) => validateStep(s).length > 0);
      if (firstBadStep) setStep(firstBadStep);
      return;
    }
    saveMutation.mutate();
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Loading your profile" />
      </div>
    );
  }

  const pill = (active: boolean) =>
    `p-3 rounded-xl border-2 cursor-pointer transition-all text-left ${
      active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
    }`;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Build your plan</h1>
          <p className="text-muted-foreground mt-2">
            Your targets are calculated from these answers — nothing is guessed.
          </p>
        </div>

        <div className="mb-6" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}
             aria-label={`Onboarding step ${step} of ${TOTAL_STEPS}`}>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step} of {TOTAL_STEPS}</p>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="mb-4 p-4 rounded-xl border border-destructive/40 bg-destructive/10">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Please fix the following</p>
                <ul className="list-disc list-inside text-sm text-foreground mt-1 space-y-0.5">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <Card className="shadow-lg border-border">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle>What is your main goal?</CardTitle>
                  <CardDescription>Describe it in your own words, or pick one below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-text">Tell us in your own words (optional)</Label>
                    <Textarea
                      id="goal-text"
                      className="resize-none h-24"
                      placeholder="e.g. I want to gain muscle while reducing body fat."
                      value={goalDescription}
                      onChange={(e) => setGoalDescription(e.target.value)}
                    />
                    <Button
                      type="button" variant="outline" size="sm"
                      disabled={!goalDescription.trim() || interpretMutation.isPending}
                      onClick={() => interpretMutation.mutate(goalDescription.trim())}
                    >
                      {interpretMutation.isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading…</>
                        : <><Sparkles className="w-4 h-4 mr-2" /> Interpret my goal</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We'll match it to a goal below. You still enter your own measurements — we never guess them.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GOALS.map((g) => (
                      <button key={g.id} type="button" className={pill(goal === g.id)}
                              aria-pressed={goal === g.id} onClick={() => setGoal(g.id)}>
                        <div className="flex items-center gap-3">
                          <span className="text-primary">{g.icon}</span>
                          <span>
                            <span className="block font-medium text-foreground">{g.label}</span>
                            <span className="block text-xs text-muted-foreground">{g.blurb}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={goNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </CardFooter>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader>
                  <CardTitle>About you</CardTitle>
                  <CardDescription>These four values determine your calorie and protein targets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input id="age" type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Current weight (kg)</Label>
                      <Input id="weight" type="number" min={30} max={300} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                    </div>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Biological sex</legend>
                    <p className="text-xs text-muted-foreground">Used by the Mifflin-St Jeor equation to estimate your metabolic rate.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["male", "female"] as BiologicalSex[]).map((s) => (
                        <button key={s} type="button" className={pill(biologicalSex === s)}
                                aria-pressed={biologicalSex === s} onClick={() => setBiologicalSex(s)}>
                          <span className="font-medium text-foreground capitalize">{s}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <div className="flex gap-2">
                      <Input id="height" type="number" step="0.1" className="flex-1" value={height}
                             onChange={(e) => setHeight(e.target.value)}
                             placeholder={heightUnit === "cm" ? "e.g. 178" : "e.g. 5.10"} />
                      <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-label="Height unit">
                        {(["cm", "ft"] as const).map((u) => (
                          <button key={u} type="button" onClick={() => setHeightUnit(u)}
                                  aria-pressed={heightUnit === u}
                                  className={`px-4 text-sm font-medium ${heightUnit === u ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Pick the unit you're entering — mixing them up throws the whole plan off.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-weight">Target weight (kg, optional)</Label>
                    <Input id="target-weight" type="number" min={30} max={300} value={targetWeightKg}
                           onChange={(e) => setTargetWeightKg(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={goNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </CardFooter>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle>How active are you?</CardTitle>
                  <CardDescription>Be honest — overestimating inflates your calorie target.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {ACTIVITY_LEVELS.map((l) => (
                      <button key={l.id} type="button" className={`${pill(activityLevel === l.id)} w-full`}
                              aria-pressed={activityLevel === l.id} onClick={() => setActivityLevel(l.id)}>
                        <div className="font-medium text-foreground">{l.label}</div>
                        <div className="text-sm text-muted-foreground">{l.description}</div>
                      </button>
                    ))}
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Training experience</legend>
                    <div className="grid grid-cols-3 gap-3">
                      {FITNESS_LEVELS.map((f) => (
                        <button key={f.id} type="button" className={pill(fitnessLevel === f.id)}
                                aria-pressed={fitnessLevel === f.id} onClick={() => setFitnessLevel(f.id)}>
                          <span className="font-medium text-foreground">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={goNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </CardFooter>
              </>
            )}

            {step === 4 && (
              <>
                <CardHeader>
                  <CardTitle>Training</CardTitle>
                  <CardDescription>Shapes your weekly plan and daily missions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Workout days per week</Label>
                    <Input id="days" type="number" min={0} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Where do you train?</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {LOCATIONS.map((l) => (
                        <button key={l.id} type="button" className={pill(location === l.id)}
                                aria-pressed={location === l.id} onClick={() => setLocation(l.id)}>
                          <span className="font-medium text-foreground text-sm">{l.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Available equipment</legend>
                    <div className="flex flex-wrap gap-2">
                      {EQUIPMENT.map((item) => {
                        const on = equipment.includes(item);
                        return (
                          <button key={item} type="button" aria-pressed={on}
                                  onClick={() => setEquipment((prev) => on ? prev.filter((x) => x !== item) : [...prev, item])}
                                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                    on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={goNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </CardFooter>
              </>
            )}

            {step === 5 && (
              <>
                <CardHeader>
                  <CardTitle>Food preferences</CardTitle>
                  <CardDescription>We never suggest anything you're allergic to or don't eat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Dietary preference</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {DIETS.map((d) => (
                        <button key={d.id} type="button" className={pill(dietaryPreference === d.id)}
                                aria-pressed={dietaryPreference === d.id} onClick={() => setDietaryPreference(d.id)}>
                          <span className="font-medium text-foreground text-sm">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies (comma separated)</Label>
                    <Input id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. peanuts, shellfish" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dislikes">Foods you dislike</Label>
                    <Input id="dislikes" value={dislikedFoods} onChange={(e) => setDislikedFoods(e.target.value)} placeholder="e.g. mushrooms, olives" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefers">Foods you love</Label>
                    <Input id="prefers" value={preferredFoods} onChange={(e) => setPreferredFoods(e.target.value)} placeholder="e.g. paneer, oats" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meals">Meals per day</Label>
                    <Input id="meals" type="number" min={1} max={8} value={mealsPerDay} onChange={(e) => setMealsPerDay(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="ghost" onClick={() => setStep(4)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button onClick={submit} disabled={saveMutation.isPending}>
                    {saveMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your plan…</>
                      : "Create my plan"}
                  </Button>
                </CardFooter>
              </>
            )}
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
