import { DIET_EXCLUSIONS } from './plan-service.js';
import type { FoodSuggestion, PersonalizedPlan, DailyNutrition } from '../shared/types.js';

export interface SuggestionContext {
  plan: PersonalizedPlan;
  today: DailyNutrition;
  dietaryPreference: string;
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  mealType: string;
}

/** A small curated table so suggestions work with no AI and no external API. */
interface Candidate {
  name: string;
  tags: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const CANDIDATES: Candidate[] = [
  { name: 'Greek yogurt with berries', tags: ['dairy', 'vegetarian'], calories: 280, protein: 25, carbs: 30, fat: 6 },
  { name: 'Paneer tikka', tags: ['dairy', 'vegetarian', 'paneer'], calories: 320, protein: 22, carbs: 10, fat: 22 },
  { name: 'Tofu stir-fry with vegetables', tags: ['vegan', 'vegetarian', 'soy'], calories: 340, protein: 22, carbs: 28, fat: 15 },
  { name: 'Lentil dal with brown rice', tags: ['vegan', 'vegetarian', 'legume'], calories: 420, protein: 20, carbs: 62, fat: 8 },
  { name: 'Chickpea and quinoa salad', tags: ['vegan', 'vegetarian', 'legume'], calories: 380, protein: 18, carbs: 52, fat: 11 },
  { name: 'Boiled eggs with wholegrain toast', tags: ['egg', 'eggs', 'vegetarian'], calories: 350, protein: 22, carbs: 30, fat: 15 },
  { name: 'Grilled chicken breast with salad', tags: ['meat', 'poultry', 'chicken'], calories: 380, protein: 42, carbs: 12, fat: 16 },
  { name: 'Baked salmon with vegetables', tags: ['fish', 'seafood'], calories: 420, protein: 34, carbs: 14, fat: 25 },
  { name: 'Whey protein shake with banana', tags: ['dairy', 'whey', 'vegetarian'], calories: 300, protein: 30, carbs: 35, fat: 4 },
  { name: 'Peanut butter on wholegrain toast', tags: ['vegan', 'vegetarian', 'nuts', 'peanut'], calories: 330, protein: 12, carbs: 34, fat: 17 },
  { name: 'Cottage cheese with pineapple', tags: ['dairy', 'vegetarian'], calories: 220, protein: 24, carbs: 18, fat: 5 },
  { name: 'Oats with milk and almonds', tags: ['dairy', 'vegetarian', 'nuts', 'almond'], calories: 360, protein: 15, carbs: 48, fat: 12 },
  { name: 'Mixed vegetable soup', tags: ['vegan', 'vegetarian'], calories: 150, protein: 6, carbs: 22, fat: 4 },
  { name: 'Apple with a handful of walnuts', tags: ['vegan', 'vegetarian', 'nuts', 'walnut'], calories: 240, protein: 5, carbs: 28, fat: 14 },
  { name: 'Grilled fish tacos', tags: ['fish', 'seafood'], calories: 400, protein: 30, carbs: 38, fat: 14 },
  { name: 'Rajma (kidney bean curry) with rice', tags: ['vegan', 'vegetarian', 'legume'], calories: 450, protein: 18, carbs: 70, fat: 9 },
];

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Removes anything the user cannot or will not eat. This is a hard filter:
 * an allergen is never surfaced regardless of how well it fits the macros.
 */
export function filterCandidates(
  candidates: Candidate[],
  dietaryPreference: string,
  allergies: string[],
  dislikedFoods: string[],
): Candidate[] {
  const excluded = (DIET_EXCLUSIONS[dietaryPreference] || []).map(normalise);
  const allergenTerms = allergies.map(normalise).filter(Boolean);
  const dislikedTerms = dislikedFoods.map(normalise).filter(Boolean);

  return candidates.filter((c) => {
    const haystack = [normalise(c.name), ...c.tags.map(normalise)];
    const matches = (term: string) => haystack.some((h) => h.includes(term) || term.includes(h));

    if (excluded.some(matches)) return false;
    if (allergenTerms.some(matches)) return false;
    if (dislikedTerms.some(matches)) return false;
    return true;
  });
}

/**
 * Ranks what is left by how well it closes today's remaining macro gap, then
 * nudges the user's stated favourites upward.
 */
export function buildFoodSuggestions(ctx: SuggestionContext): FoodSuggestion[] {
  const { plan, today } = ctx;
  const caloriesRemaining = Math.max(0, plan.targets.calories - today.calories);
  const proteinRemaining = Math.max(0, plan.targets.proteinGrams - today.protein);

  const allowed = filterCandidates(
    CANDIDATES,
    ctx.dietaryPreference,
    ctx.allergies,
    ctx.dislikedFoods,
  );

  const preferred = ctx.preferredFoods.map(normalise).filter(Boolean);

  const scored = allowed.map((c) => {
    // Penalise overshooting the remaining calorie budget more than undershooting.
    const calorieFit = caloriesRemaining > 0
      ? (c.calories <= caloriesRemaining ? 1 - Math.abs(caloriesRemaining - c.calories) / Math.max(caloriesRemaining, 1) : -0.5)
      : (c.calories <= 250 ? 0.5 : -1);

    const proteinFit = proteinRemaining > 0 ? Math.min(1, c.protein / Math.max(proteinRemaining, 1)) : 0;

    const isPreferred = preferred.some((p) =>
      normalise(c.name).includes(p) || c.tags.some((t) => normalise(t).includes(p)),
    );

    return { c, score: calorieFit * 0.4 + proteinFit * 0.6 + (isPreferred ? 0.5 : 0) };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ c }) => ({
    name: c.name,
    reason: buildReason(c, proteinRemaining, caloriesRemaining, plan),
    estimatedCalories: c.calories,
    estimatedProteinGrams: c.protein,
    estimatedCarbsGrams: c.carbs,
    estimatedFatGrams: c.fat,
    // These come from a reference table, not a verified nutrition database.
    isEstimate: true,
  }));
}

function buildReason(
  c: Candidate,
  proteinRemaining: number,
  caloriesRemaining: number,
  plan: PersonalizedPlan,
): string {
  if (proteinRemaining > 20 && c.protein >= 20) {
    return `Covers ${Math.min(c.protein, Math.round(proteinRemaining))}g of your remaining ${Math.round(proteinRemaining)}g protein.`;
  }
  if (caloriesRemaining > 0 && c.calories <= caloriesRemaining) {
    return `Fits inside your remaining ${caloriesRemaining} kcal for today.`;
  }
  if (plan.goal.primaryGoal === 'LOSE_WEIGHT') {
    return 'Lighter option that keeps you close to your deficit.';
  }
  return 'Balanced option for your current targets.';
}
