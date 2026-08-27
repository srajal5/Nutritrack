import { useState } from "react";
import { Link } from "wouter";
import {
  Plus, Brain, Droplet, Flame, Target, TrendingUp, Flame as Streak,
  CheckCircle2, Circle, Utensils, ArrowRight, AlertCircle, Loader2,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { usePlan, invalidatePlanData } from "../hooks/use-plan";
import { lazy, Suspense } from "react";
import DashboardSkeleton from "../components/DashboardSkeleton";

// Restored to the dashboard: the macro split and the weekly trend are the only
// place carbs/fat and 7-day calories are visible. Lazy so chart.js stays out of
// the initial bundle.
const NutrientBreakdownChart = lazy(() => import("../components/NutrientBreakdownChart"));
const WeeklyCaloriesChart = lazy(() => import("../components/WeeklyCaloriesChart"));

function ChartFallback() {
  return <div className="h-64 w-full bg-muted/40 rounded animate-pulse" aria-hidden />;
}
import { motion } from "framer-motion";
import { useToast } from "../hooks/use-toast";
import type { DashboardPayload, FoodSuggestion, Mission } from "@shared/types";

interface ProgressSummary {
  hasEnoughHistory: boolean;
  daysLogged: number;
  proteinConsistencyPct: number | null;
  calorieConsistencyPct: number | null;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightHistory: { weightKg: number; recordedAt: string }[];
}

type DashboardData = DashboardPayload & {
  progressSummary: ProgressSummary | null;
  foodSuggestions: FoodSuggestion[];
  remaining: { calories: number; protein: number; carbs: number; fat: number } | null;
};

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: "Weight Loss",
  GAIN_WEIGHT: "Weight Gain",
  BUILD_MUSCLE: "Muscle Building",
  BODY_RECOMPOSITION: "Body Recomposition",
  MAINTAIN_WEIGHT: "Maintenance",
  IMPROVE_FITNESS: "Fitness",
  IMPROVE_NUTRITION: "Nutrition Quality",
  GENERAL_HEALTH: "General Health",
};

const litres = (ml: number) => `${(ml / 1000).toFixed(1)}L`;
const clampPct = (v: number) => Math.max(0, Math.min(100, v));

function barTone(pct: number) {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-primary";
}

/** Accessible progress bar. Native <progress> styling is inconsistent across themes. */
function Bar({ pct, label }: { pct: number; label: string }) {
  const v = clampPct(pct);
  return (
    <div
      role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className="w-full h-2 rounded-full bg-muted overflow-hidden mt-3"
    >
      <div className={`h-full rounded-full transition-all duration-500 ${barTone(v)}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function MetricCard({
  icon, tint, title, value, sub, pct, footer,
}: {
  icon: React.ReactNode; tint: string; title: string;
  value: string; sub?: string; pct?: number; footer: string;
}) {
  return (
    <div className="card min-w-0 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 border border-border">
      <div className="card-body p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-full ${tint}`}>{icon}</div>
          <p className="text-sm font-medium">{title}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        </div>
        {pct !== undefined && <Bar pct={pct} label={`${title} progress`} />}
        <p className="text-xs text-muted-foreground mt-2">{footer}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  // The canonical hook — the same one Profile, Tracker and AI Coach read.
  const { data: raw, isLoading, isError } = usePlan();
  const data = raw as DashboardData | undefined;

  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const logWater = useMutation({
    mutationFn: async (amountMl: number) => {
      const res = await apiRequest("POST", "/api/food-entries/water", { amountMl });
      return res.json();
    },
    // Refetch rather than patching local state, so the numbers on screen always
    // match what is actually stored.
    onSuccess: async () => {
      await invalidatePlanData();
      toast({ title: "Water logged" });
    },
    onError: (e: Error) => toast({ title: "Couldn't log water", description: e.message, variant: "destructive" }),
  });

  const logSuggestion = useMutation({
    mutationFn: async (s: FoodSuggestion) => {
      const res = await apiRequest("POST", "/api/food-entries", {
        name: s.name,
        servingSize: "1 serving",
        mealType: "snack",
        calories: s.estimatedCalories,
        protein: s.estimatedProteinGrams,
        carbs: s.estimatedCarbsGrams,
        fat: s.estimatedFatGrams,
        entryDate: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: async (_r, s) => {
      await invalidatePlanData();
      setPendingSuggestion(null);
      toast({ title: "Meal logged", description: `${s.name} added to today.` });
    },
    onError: (e: Error) => toast({ title: "Couldn't log meal", description: e.message, variant: "destructive" }),
  });

  const logWeight = useMutation({
    mutationFn: async (weightKg: number) => {
      const res = await apiRequest("POST", "/api/weight", { weightKg });
      return res.json();
    },
    // Weight feeds the calorie calculation, so everything derived is refreshed.
    onSuccess: async () => {
      await invalidatePlanData();
      setWeightInput("");
      toast({ title: "Weight recorded" });
    },
    onError: (e: Error) => toast({ title: "Couldn't record weight", description: e.message, variant: "destructive" }),
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Unable to load your dashboard</h1>
          <p className="text-muted-foreground mt-2">Something went wrong fetching your plan. Try again.</p>
          <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => window.location.reload()}>
            Retry
          </button>
        </main>
      </div>
    );
  }

  // Skeleton while loading — never render zeros that look like real data.
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="sr-only" role="status">Loading your personalized plan…</p>
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  const name = data.user.displayName;

  // No plan means no numbers. Prompt instead of inventing targets.
  if (data.planStatus !== "ready" || !data.plan) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-8 text-center">
              <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Complete your personalized plan</h1>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                We don't have enough information to calculate your targets yet, and we won't show you
                numbers that aren't really yours.
              </p>
              {data.missingFields.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  Still needed: <span className="text-foreground font-medium">{data.missingFields.join(", ")}</span>
                </p>
              )}
              <Link href="/onboarding" className="btn btn-primary mt-6">
                Build my plan <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const plan = data.plan;
  const t = plan.targets;
  const today = data.today;
  const progress = data.progress!;
  const goalLabel = GOAL_LABELS[plan.goal.primaryGoal] ?? plan.goal.primaryGoal;

  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

  const completedMissions = data.missions.filter((m: Mission) => m.completed).length;

  const remaining = data.remaining ?? {
    calories: Math.max(0, t.calories - Math.round(today.calories)),
    protein: Math.max(0, t.proteinGrams - Math.round(today.protein)),
    carbs: Math.max(0, t.carbsGrams - Math.round(today.carbs)),
    fat: Math.max(0, t.fatGrams - Math.round(today.fat)),
  };

  const visibleSuggestions = showAllSuggestions
    ? data.foodSuggestions
    : data.foodSuggestions.slice(0, 1);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="visible">

          {/* Header */}
          <motion.div variants={item}>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {name} 👋</h1>
            <p className="text-muted-foreground mt-1">
              Here's your nutrition overview for today ·{" "}
              <span className="text-primary font-medium">{goalLabel} plan</span>
            </p>
          </motion.div>

          {/* Metric cards */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" variants={item}>
            <MetricCard
              icon={<Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
              tint="bg-orange-100 dark:bg-orange-900/30"
              title="Calories"
              value={Math.round(today.calories).toLocaleString()}
              sub={`/ ${t.calories.toLocaleString()} kcal`}
              pct={progress.caloriesPct}
              footer={`${Math.max(0, t.calories - Math.round(today.calories)).toLocaleString()} kcal remaining`}
            />
            <MetricCard
              icon={<Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              tint="bg-blue-100 dark:bg-blue-900/30"
              title="Protein"
              value={`${Math.round(today.protein)}g`}
              sub={`/ ${t.proteinGrams}g`}
              pct={progress.proteinPct}
              footer={`${Math.max(0, t.proteinGrams - Math.round(today.protein))}g remaining`}
            />
            <MetricCard
              icon={<Droplet className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
              tint="bg-cyan-100 dark:bg-cyan-900/30"
              title="Water"
              value={litres(today.waterMl)}
              sub={`/ ${litres(t.waterMl)}`}
              pct={progress.waterPct}
              footer={`${litres(Math.max(0, t.waterMl - today.waterMl))} remaining`}
            />
            <MetricCard
              icon={<Streak className="h-4 w-4 text-green-600 dark:text-green-400" />}
              tint="bg-green-100 dark:bg-green-900/30"
              title="Streak"
              value={`🔥 ${data.streakDays}`}
              sub={data.streakDays === 1 ? "day" : "days"}
              footer={data.streakDays > 0 ? "Keep it going" : "Log a meal to start a streak"}
            />
          </motion.div>

          {/* Quick water actions */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">Add water:</span>
            {[250, 500, 750].map((ml) => (
              <button
                key={ml} type="button"
                onClick={() => logWater.mutate(ml)}
                disabled={logWater.isPending}
                aria-label={`Log ${ml} millilitres of water`}
                className="btn btn-sm btn-outline gap-1"
              >
                <Droplet className="h-3.5 w-3.5" /> {ml}ml
              </button>
            ))}
            {logWater.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </motion.div>

          {/* AI daily brief + missions */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={item}>
            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <h2 className="card-title text-lg font-semibold flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-primary" /> AI Daily Brief
                </h2>
                {data.aiBrief ? (
                  <>
                    <p className="text-foreground font-medium">{data.aiBrief.headline}</p>
                    <p className="text-sm text-muted-foreground mt-2">{data.aiBrief.body}</p>
                    {data.aiBrief.focusAreas.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Focus</p>
                        <div className="flex flex-wrap gap-2">
                          {data.aiBrief.focusAreas.map((f) => (
                            <span key={f} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link href="/ai-coach" className="btn btn-primary btn-sm mt-5 w-fit">Ask AI Coach</Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Your brief will appear once your plan is active.</p>
                )}
              </div>
            </div>

            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="card-title text-lg font-semibold flex items-center gap-2">🎯 Today's Missions</h2>
                  <span className="text-sm text-muted-foreground">{completedMissions} / {data.missions.length}</span>
                </div>
                <ul className="space-y-3">
                  {data.missions.map((m: Mission) => (
                    <li key={m.id} className="flex items-start gap-3">
                      {m.completed
                        ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" aria-hidden />
                        : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />}
                      <div>
                        <p className={`text-sm font-medium ${m.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {m.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/stats" className="btn btn-ghost btn-sm mt-4 w-fit text-primary">View all goals →</Link>
              </div>
            </div>
          </motion.div>

          {/* Progress */}
          <motion.div variants={item}>
            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Your Progress
                  </h2>
                  <span className="text-xs text-muted-foreground">Last 7 days</span>
                </div>

                {/* Weight stands alone: it depends on weigh-ins, not on how many
                    days of meals have been logged. */}
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Weight</p>
                  <p className="text-lg font-semibold text-foreground">
                    {data.progressSummary?.currentWeightKg ?? "—"} kg
                    {data.progressSummary?.targetWeightKg
                      ? <span className="text-muted-foreground text-sm"> → {data.progressSummary.targetWeightKg} kg</span>
                      : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(data.progressSummary?.weightHistory?.length ?? 0) >= 2
                      ? `${data.progressSummary!.weightHistory.length} measurements recorded`
                      : "Track weight regularly to see your trend."}
                  </p>
                </div>

                {data.progressSummary?.hasEnoughHistory ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="hidden">
                      <p className="text-xs text-muted-foreground mb-1">Weight</p>
                      <p className="text-lg font-semibold text-foreground">
                        {data.progressSummary.currentWeightKg ?? "—"} kg
                        {data.progressSummary.targetWeightKg
                          ? <span className="text-muted-foreground text-sm"> → {data.progressSummary.targetWeightKg} kg</span>
                          : null}
                      </p>
                      {data.progressSummary.weightHistory.length >= 2 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.progressSummary.weightHistory.length} measurements recorded
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Track weight regularly to see your trend.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Protein consistency</p>
                      <p className="text-lg font-semibold text-foreground">{data.progressSummary.proteinConsistencyPct}%</p>
                      <Bar pct={data.progressSummary.proteinConsistencyPct ?? 0} label="Protein consistency" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Calorie consistency</p>
                      <p className="text-lg font-semibold text-foreground">{data.progressSummary.calorieConsistencyPct}%</p>
                      <Bar pct={data.progressSummary.calorieConsistencyPct ?? 0} label="Calorie consistency" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    Start logging meals to unlock your 7-day progress.
                    {data.progressSummary ? ` (${data.progressSummary.daysLogged} of 2 days logged so far)` : null}
                  </p>
                )}
                <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[160px]">
                    <label htmlFor="weight-input" className="block text-xs text-muted-foreground mb-1">
                      Record today's weight (kg)
                    </label>
                    <input
                      id="weight-input" type="number" step="0.1" min={30} max={300}
                      className="input input-bordered input-sm w-full"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="e.g. 72.4"
                    />
                  </div>
                  <button
                    type="button" className="btn btn-sm btn-outline"
                    disabled={!weightInput || logWeight.isPending}
                    onClick={() => logWeight.mutate(Number(weightInput))}
                  >
                    {logWeight.isPending ? "Saving…" : "Save weight"}
                  </button>
                  <Link href="/stats" className="btn btn-ghost btn-sm text-primary ml-auto">View detailed stats →</Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Macro split + weekly trend */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={item}>
            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <h2 className="card-title text-lg font-semibold mb-1">Today's Nutrition</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Carbs {Math.round(today.carbs)}g / {t.carbsGrams}g · Fat {Math.round(today.fat)}g / {t.fatGrams}g
                </p>
                <div className="min-h-[250px]" data-testid="macro-breakdown">
                  <Suspense fallback={<ChartFallback />}>
                    <NutrientBreakdownChart />
                  </Suspense>
                </div>
              </div>
            </div>

            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <h2 className="card-title text-lg font-semibold mb-3">Weekly Calories</h2>
                <div data-testid="weekly-calories">
                  <Suspense fallback={<ChartFallback />}>
                    <WeeklyCaloriesChart />
                  </Suspense>
                </div>
              </div>
            </div>
          </motion.div>

          {/* What should I eat next? — full width, driven by remaining macros */}
          <motion.div variants={item}>
            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <h2 className="card-title text-lg font-semibold flex items-center gap-2 mb-1">
                  🍽 What should I eat next?
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {remaining.calories > 0 || remaining.protein > 0 ? (
                    <>You have <span className="text-foreground font-medium">{remaining.calories} kcal</span> and{" "}
                    <span className="text-foreground font-medium">{remaining.protein}g protein</span> remaining.</>
                  ) : (
                    <>You have met today's calorie and protein targets.</>
                  )}
                </p>

                {data.foodSuggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suitable suggestion found from your current preferences. Try adding more preferred foods in your profile.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {visibleSuggestions.map((s, i) => (
                        <li key={s.name} className="p-4 rounded-xl border border-border">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">
                                {i === 0 && !showAllSuggestions && <span aria-hidden className="mr-1">⭐</span>}
                                {s.name}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">{s.reason}</p>
                              <p className="text-sm text-foreground mt-2">
                                {s.estimatedCalories} kcal · {s.estimatedProteinGrams}g protein
                                {s.isEstimate && (
                                  <span className="ml-2 text-xs text-muted-foreground italic">estimated values</span>
                                )}
                              </p>
                            </div>

                            {pendingSuggestion === s.name ? (
                              /* Estimates are never logged silently — the user confirms them first. */
                              <div className="flex flex-col gap-2 shrink-0">
                                <p className="text-xs text-muted-foreground max-w-[200px]">
                                  Log as ~{s.estimatedCalories} kcal, {s.estimatedProteinGrams}g protein,
                                  {" "}{s.estimatedCarbsGrams}g carbs, {s.estimatedFatGrams}g fat?
                                </p>
                                <div className="flex gap-2">
                                  <button type="button" className="btn btn-xs btn-primary"
                                          onClick={() => logSuggestion.mutate(s)}
                                          disabled={logSuggestion.isPending}>
                                    {logSuggestion.isPending ? "Logging…" : "Confirm & log"}
                                  </button>
                                  <button type="button" className="btn btn-xs btn-ghost"
                                          onClick={() => setPendingSuggestion(null)}>
                                    Cancel
                                  </button>
                                </div>
                                <Link href="/tracker" className="text-xs text-primary underline">
                                  Adjust portion in Tracker
                                </Link>
                              </div>
                            ) : (
                              <button type="button" className="btn btn-sm btn-primary shrink-0"
                                      onClick={() => setPendingSuggestion(s.name)}
                                      aria-label={`Log ${s.name} as a meal`}>
                                Log this meal
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {data.foodSuggestions.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm mt-3 text-primary"
                              onClick={() => setShowAllSuggestions((v) => !v)}
                              aria-expanded={showAllSuggestions}>
                        {showAllSuggestions ? "Show fewer" : "More suggestions"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent meals + AI coach */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={item}>
            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="card-title text-lg font-semibold flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" /> Recent Meals
                  </h2>
                  <Link href="/tracker" className="btn btn-ghost btn-sm text-primary">View All</Link>
                </div>

                {data.recentMeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No meals logged today.</p>
                    <Link href="/tracker" className="btn btn-primary btn-sm mt-4">Log your first meal →</Link>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {data.recentMeals.slice(0, 5).map((m) => (
                        <li key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                          <div>
                            <p className="font-medium text-sm capitalize">{m.mealType}</p>
                            <p className="text-xs text-muted-foreground">{m.name}</p>
                          </div>
                          <p className="font-semibold text-sm">{m.calories} kcal</p>
                        </li>
                      ))}
                    </ul>
                    <Link href="/tracker" className="btn btn-primary btn-sm mt-4 w-fit">Log Food +</Link>
                  </>
                )}
              </div>
            </div>

            <div className="card bg-card border border-border shadow-sm">
              <div className="card-body p-6">
                <h2 className="card-title text-lg font-semibold flex items-center gap-2 mb-3">
                  🤖 AI Coach
                </h2>

                {data.progressSummary?.hasEnoughHistory ? (
                  <p className="text-sm text-foreground">
                    Over your last {data.progressSummary.daysLogged} logged days you have averaged{" "}
                    <span className="font-medium">{data.progressSummary.proteinConsistencyPct}%</span> of your protein
                    target and <span className="font-medium">{data.progressSummary.calorieConsistencyPct}%</span> of
                    your calorie target.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not enough history for a weekly insight yet. Log a few more days and your trends appear here.
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Ask about your {goalLabel.toLowerCase()} plan, meals or training — the coach sees your real targets.
                </p>
                <Link href="/ai-coach" className="btn btn-primary btn-sm mt-4 w-fit">Ask AI</Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
