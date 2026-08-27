/**
 * READ-ONLY diagnostic for user profile data quality.
 *
 * Writes nothing and changes nothing. Run with:
 *   npx tsx server/diagnose-profiles.ts
 *
 * Produces the userId / problem / currentValue / expectedValue /
 * recommendedAction report. Migration is deliberately NOT performed here.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { LIMITS, normalizeHeightToCm } from './nutrition-calculator.js';

interface Finding {
  userId: number;
  problem: string;
  currentValue: string;
  expectedValue: string;
  recommendedAction: string;
  unambiguous: boolean;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;

  const profiles = await db.collection('userprofiles').find({}).toArray();
  const users = await db.collection('users').find({}, { projection: { id: 1, username: 1 } }).toArray();
  const nameById = new Map(users.map((u: any) => [u.id, u.username]));

  const findings: Finding[] = [];

  for (const p of profiles as any[]) {
    const userId = p.userId;
    const prof = p.profile || {};

    // Height: the dominant defect. A value of 6 cannot be centimetres.
    const h = prof.heightCm;
    if (typeof h !== 'number' || !Number.isFinite(h)) {
      findings.push({
        userId, problem: 'height missing', currentValue: String(h),
        expectedValue: `${LIMITS.heightCm.min}-${LIMITS.heightCm.max} cm`,
        recommendedAction: 'Ask the user to re-enter height during onboarding.',
        unambiguous: false,
      });
    } else if (h < LIMITS.heightCm.min) {
      const asCm = normalizeHeightToCm(h, 'ft');
      const plausible = h >= 3.5 && h <= 8;
      findings.push({
        userId,
        problem: 'height stored in feet inside a centimetre field',
        currentValue: `${h}`,
        expectedValue: plausible ? `${asCm} cm` : `${LIMITS.heightCm.min}-${LIMITS.heightCm.max} cm`,
        recommendedAction: plausible
          ? `Convert ${h} ft -> ${asCm} cm, or ask the user to confirm.`
          : 'Value is not a plausible height in either unit. Ask the user to re-enter.',
        unambiguous: plausible,
      });
    } else if (h > LIMITS.heightCm.max) {
      findings.push({
        userId, problem: 'height out of range', currentValue: `${h} cm`,
        expectedValue: `${LIMITS.heightCm.min}-${LIMITS.heightCm.max} cm`,
        recommendedAction: 'Ask the user to re-enter height.',
        unambiguous: false,
      });
    }

    const sex = prof.biologicalSex ?? prof.gender;
    if (sex !== 'male' && sex !== 'female') {
      findings.push({
        userId, problem: 'biological sex missing', currentValue: String(sex),
        expectedValue: "'male' or 'female'",
        recommendedAction: 'Required by Mifflin-St Jeor. Ask the user; do NOT assume a default.',
        unambiguous: false,
      });
    }

    if (typeof prof.weightKg !== 'number' || prof.weightKg < LIMITS.weightKg.min || prof.weightKg > LIMITS.weightKg.max) {
      findings.push({
        userId, problem: 'weight missing or out of range', currentValue: String(prof.weightKg),
        expectedValue: `${LIMITS.weightKg.min}-${LIMITS.weightKg.max} kg`,
        recommendedAction: 'Ask the user to re-enter weight.',
        unambiguous: false,
      });
    }

    if (typeof prof.age !== 'number' || prof.age < LIMITS.age.min || prof.age > LIMITS.age.max) {
      findings.push({
        userId, problem: 'age missing or out of range', currentValue: String(prof.age),
        expectedValue: `${LIMITS.age.min}-${LIMITS.age.max}`,
        recommendedAction: 'Ask the user to re-enter age.',
        unambiguous: false,
      });
    }

    if (!p.goal?.primaryGoal) {
      findings.push({
        userId, problem: 'primary goal missing', currentValue: 'undefined',
        expectedValue: 'one of the supported goals',
        recommendedAction: 'Ask the user to choose a goal; do NOT default to maintenance.',
        unambiguous: false,
      });
    }

    if (!p.plan?.targets?.calories) {
      findings.push({
        userId, problem: 'no persisted plan',
        currentValue: 'plan.targets absent',
        expectedValue: 'a calculated plan',
        recommendedAction: 'User will see "Complete your personalized plan" until they re-run onboarding.',
        unambiguous: false,
      });
    }
  }

  const affected = [...new Set(findings.map((f) => f.userId))];

  console.log('\n=== PROFILE DATA DIAGNOSTIC (read-only, nothing was modified) ===\n');
  console.log(`Profiles scanned : ${profiles.length}`);
  console.log(`Profiles affected: ${affected.length}`);
  console.log(`Total findings   : ${findings.length}\n`);

  for (const userId of affected) {
    console.log(`--- userId ${userId} (${nameById.get(userId) ?? 'unknown'}) ---`);
    for (const f of findings.filter((x) => x.userId === userId)) {
      console.log(`  problem           : ${f.problem}`);
      console.log(`  currentValue      : ${f.currentValue}`);
      console.log(`  expectedValue     : ${f.expectedValue}`);
      console.log(`  recommendedAction : ${f.recommendedAction}`);
      console.log(`  unambiguous fix   : ${f.unambiguous ? 'YES' : 'no - needs the user'}`);
      console.log('');
    }
  }

  const fixable = findings.filter((f) => f.unambiguous);
  console.log('=== SUMMARY ===');
  console.log(`Unambiguously repairable without asking the user: ${fixable.length}`);
  for (const f of fixable) console.log(`  userId ${f.userId}: ${f.currentValue} -> ${f.expectedValue}`);
  console.log('\nNo migration has been run. These users see "Complete your personalized plan"');
  console.log('rather than fabricated targets, which is the intended behaviour.\n');

  await mongoose.disconnect();
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
