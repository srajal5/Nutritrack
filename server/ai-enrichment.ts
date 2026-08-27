import { z } from 'zod';
import { callAIJson } from './openai.js';
import type { AIInsight, DailyNutrition, FoodSuggestion, PersonalizedPlan } from '../shared/types.js';

/**
 * AI enrichment layer.
 *
 * Division of responsibility, deliberately strict:
 *   - Deterministic code owns every NUMBER and every SAFETY decision
 *     (targets, remaining macros, allergy and diet filtering).
 *   - The model owns LANGUAGE and RANKING only.
 *
 * If the model is slow, unreachable or returns nonsense, the deterministic
 * result is used unchanged. The dashboard never depends on the model.
 */

const AI_TIMEOUT_MS = 8000;

type JsonCaller = (prompt: string, systemMessage: string) => Promise<unknown>;

// Indirection so tests can substitute the model without network access.
let jsonCaller: JsonCaller = callAIJson;

/** Test seam. Pass no argument to restore the real model client. */
export function setJsonCaller(fn?: JsonCaller) {
  jsonCaller = fn ?? callAIJson;
}

/** Never let a slow model hold up a dashboard render. */
async function withTimeout<T>(p: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), ms)),
  ]);
}

const briefSchema = z.object({
  headline: z.string().min(3).max(160),
  body: z.string().min(10).max(600),
});

/**
 * Rewrites the deterministic brief in a warmer, more specific voice.
 * The model is given the already-computed figures and told to restate them,
 * never to calculate. If validation fails, the deterministic brief is returned.
 */
export async function enrichDailyBrief(
  deterministic: AIInsight,
  plan: PersonalizedPlan,
  today: DailyNutrition,
): Promise<AIInsight> {
  const t = plan.targets;

  const facts = [
    `Goal: ${plan.goal.primaryGoal}${plan.goal.goalDescription ? ` ("${plan.goal.goalDescription}")` : ''}`,
    `Calories: ${Math.round(today.calories)} of ${t.calories} kcal (${pct(today.calories, t.calories)}%)`,
    `Protein: ${Math.round(today.protein)} of ${t.proteinGrams} g (${pct(today.protein, t.proteinGrams)}%)`,
    `Carbs: ${Math.round(today.carbs)} of ${t.carbsGrams} g`,
    `Fat: ${Math.round(today.fat)} of ${t.fatGrams} g`,
    `Water: ${today.waterMl} of ${t.waterMl} ml (${pct(today.waterMl, t.waterMl)}%)`,
    `Focus areas: ${plan.focusAreas.join(', ')}`,
  ].join('\n');

  const prompt = [
    "Write today's coaching brief for this user.",
    '',
    'TODAY (already calculated — restate, never recalculate):',
    facts,
    '',
    'RULES',
    '- Use only the figures above. Do not invent any number or percentage.',
    '- Do not claim a trend or improvement; you have no historical data here.',
    '- Address the single most useful gap, tied to their goal.',
    '- headline: one short sentence. body: two sentences of practical advice.',
    '- Return JSON only: {"headline": string, "body": string}',
  ].join('\n');

  try {
    const raw = await withTimeout(jsonCaller(prompt, 'You are a concise, factual nutrition coach.'));
    const parsed = briefSchema.parse(raw);

    // Reject hallucinated statistics: any percentage the model states must be
    // one we actually gave it.
    if (containsUnsupportedStat(`${parsed.headline} ${parsed.body}`, today, t)) {
      console.warn('[ai-enrichment] brief contained an unsupported statistic, using deterministic copy');
      return deterministic;
    }

    return {
      headline: parsed.headline,
      body: parsed.body,
      focusAreas: deterministic.focusAreas,
      isFallback: false,
    };
  } catch (err) {
    console.warn('[ai-enrichment] daily brief enrichment unavailable:', (err as Error)?.message);
    return deterministic;
  }
}

function pct(consumed: number, target: number): number {
  if (!target) return 0;
  return Math.round((consumed / target) * 100);
}

/**
 * Guards against the model asserting progress claims it cannot know, such as
 * "your protein improved 18% this week".
 */
function containsUnsupportedStat(text: string, today: DailyNutrition, t: PersonalizedPlan['targets']): boolean {
  if (/\b(improved|increased|decreased|up|down)\s+(by\s+)?\d+\s*%/i.test(text)) return true;
  if (/\b(this|last)\s+week\b/i.test(text) && /\d+\s*%/.test(text)) return true;

  const allowed = new Set([
    pct(today.calories, t.calories),
    pct(today.protein, t.proteinGrams),
    pct(today.carbs, t.carbsGrams),
    pct(today.fat, t.fatGrams),
    pct(today.waterMl, t.waterMl),
    0, 100,
  ]);

  const stated = [...text.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
  // Allow a point of rounding slack in either direction.
  return stated.some((n) => ![...allowed].some((a) => Math.abs(a - n) <= 1));
}

const rankingSchema = z.object({
  ranking: z.array(z.object({
    name: z.string(),
    reason: z.string().max(220),
  })).min(1),
});

/**
 * Re-orders and re-words ALREADY-FILTERED suggestions.
 *
 * The candidate list handed in has already passed the hard allergy, diet and
 * dislike filters. The model may only reorder that list and write the "why" —
 * anything it invents that is not in the list is discarded, so the AI can never
 * introduce an unsafe food.
 */
export async function enrichFoodSuggestions(
  safeCandidates: FoodSuggestion[],
  plan: PersonalizedPlan,
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  context: { dietaryPreference: string; allergies: string[]; preferredFoods: string[]; mealType: string },
): Promise<FoodSuggestion[]> {
  if (safeCandidates.length === 0) return safeCandidates;

  const byName = new Map(safeCandidates.map((c) => [c.name.toLowerCase(), c]));

  const prompt = [
    `Rank these food options for a user whose goal is ${plan.goal.primaryGoal}.`,
    '',
    'REMAINING TODAY:',
    `- ${remaining.calories} kcal, ${remaining.protein}g protein, ${remaining.carbs}g carbs, ${remaining.fat}g fat`,
    `- Meal slot: ${context.mealType}`,
    `- Diet: ${context.dietaryPreference}`,
    context.preferredFoods.length ? `- Favourites: ${context.preferredFoods.join(', ')}` : '',
    '',
    'OPTIONS (choose only from these, exactly by name):',
    ...safeCandidates.map((c) => `- ${c.name} (${c.estimatedCalories} kcal, ${c.estimatedProteinGrams}g protein)`),
    '',
    'RULES',
    '- Only use names from the list above. Never suggest anything else.',
    '- Do not restate or change the calorie/protein figures.',
    '- reason: one short sentence on why it suits their goal and remaining macros.',
    '- Return JSON only: {"ranking": [{"name": string, "reason": string}]}',
  ].filter(Boolean).join('\n');

  try {
    const raw = await withTimeout(jsonCaller(prompt, 'You rank food options. You never invent foods.'));
    const parsed = rankingSchema.parse(raw);

    const ordered: FoodSuggestion[] = [];
    for (const item of parsed.ranking) {
      const match = byName.get(item.name.toLowerCase().trim());
      // Silently drop anything the model made up — it never reaches the user.
      if (match && !ordered.some((o) => o.name === match.name)) {
        ordered.push({ ...match, reason: item.reason || match.reason });
      }
    }

    // Anything the model omitted keeps its deterministic ordering at the end.
    for (const c of safeCandidates) {
      if (!ordered.some((o) => o.name === c.name)) ordered.push(c);
    }

    return ordered.slice(0, safeCandidates.length);
  } catch (err) {
    console.warn('[ai-enrichment] suggestion ranking unavailable:', (err as Error)?.message);
    return safeCandidates;
  }
}
