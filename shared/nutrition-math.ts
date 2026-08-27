/**
 * Percentage helpers shared by every component that renders progress.
 *
 * These exist because several components divided by a target directly. When a
 * user has no plan the target is 0, so `consumed / 0` produced `NaN%` (0/0) or
 * `Infinity%` (n/0) on screen. A missing target is a distinct state from zero
 * progress and must be rendered as such, never as a number.
 */

/** Percentage of a target, or null when there is no usable target. */
export function safePct(consumed: number, target: number): number | null {
  if (!Number.isFinite(consumed) || !Number.isFinite(target) || target <= 0) return null;
  return Math.round((consumed / target) * 100);
}

/** Percentage clamped to 0-100, for visual progress bars. */
export function barPct(consumed: number, target: number): number {
  const pct = safePct(consumed, target);
  if (pct === null) return 0;
  return Math.max(0, Math.min(100, pct));
}

/** Renders a percentage for display, or an em dash when no target exists. */
export function formatPct(consumed: number, target: number): string {
  const pct = safePct(consumed, target);
  return pct === null ? '—' : `${pct}%`;
}

/** True when the plan has usable targets to measure progress against. */
export function hasUsableTargets(goals: { calorieGoal?: number; proteinGoal?: number } | null | undefined): boolean {
  return !!goals && (goals.calorieGoal ?? 0) > 0 && (goals.proteinGoal ?? 0) > 0;
}
