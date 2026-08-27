/**
 * Seeds deterministic fixtures for the component regression tests, writing the
 * canonical plan directly so components can be asserted against EXACT values
 * rather than whatever the calculator happens to produce.
 *
 * Creates:
 *   - a "canonical" user with plan 2400/150/260/75/3000 and today 1780/115/190/52/1900
 *   - an "incomplete" user whose profile is invalid (height in feet, no sex),
 *     to prove no plan is fabricated for them
 *
 * Usage:  node tests/seed-fixtures.mjs [--cleanup]
 * Only ever touches usernames prefixed `fixture_`.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const PREFIX = 'fixture_';
const PASSWORD = 'secret123';

export const CANONICAL = {
  targets: { calories: 2400, proteinGrams: 150, carbsGrams: 260, fatGrams: 75, fiberGrams: 34, waterMl: 3000 },
  today: { calories: 1780, protein: 115, carbs: 190, fat: 52, waterMl: 1900 },
};

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);
  return mongoose.connection;
}

async function nextId(col) {
  const last = await col.find().sort({ id: -1 }).limit(1).toArray();
  return (last[0]?.id ?? 0) + 1;
}

async function cleanup(db) {
  const users = await db.collection('users').find({ username: { $regex: `^${PREFIX}` } }).toArray();
  const ids = users.map((u) => u.id);
  const r1 = await db.collection('users').deleteMany({ id: { $in: ids } });
  const r2 = await db.collection('userprofiles').deleteMany({ userId: { $in: ids } });
  const r3 = await db.collection('nutritiongoals').deleteMany({ userId: { $in: ids } });
  const r4 = await db.collection('foodentries').deleteMany({ userId: { $in: ids } });
  const r5 = await db.collection('weightentries').deleteMany({ userId: { $in: ids } });
  return { users: r1.deletedCount, profiles: r2.deletedCount, goals: r3.deletedCount, entries: r4.deletedCount, weights: r5.deletedCount };
}

async function createUser(db, username, email) {
  const users = db.collection('users');
  const id = await nextId(users);
  await users.insertOne({
    id, username, email,
    password: await bcrypt.hash(PASSWORD, 10),
    firebaseId: `local_fixture_${id}`,
    createdAt: new Date(), updatedAt: new Date(),
  });
  return id;
}

export async function seed() {
  const db = await connect();
  await cleanup(db);

  const stamp = Date.now();
  const canonicalName = `${PREFIX}canonical_${stamp}`;
  const incompleteName = `${PREFIX}incomplete_${stamp}`;

  // ---- Canonical user: exact plan, exact intake ----
  const uid = await createUser(db, canonicalName, `${canonicalName}@x.com`);
  const profiles = db.collection('userprofiles');
  await profiles.insertOne({
    id: await nextId(profiles), userId: uid, isCompleted: true,
    profile: {
      age: 28, gender: 'male', biologicalSex: 'male',
      heightCm: 180, weightKg: 78, targetWeightKg: 82,
      activityLevel: 'ACTIVE', fitnessLevel: 'INTERMEDIATE',
    },
    goal: { primaryGoal: 'BUILD_MUSCLE', goalDescription: 'I want to gain muscle', secondaryGoals: [] },
    workout: { daysPerWeek: 4, location: 'GYM', equipment: ['Dumbbells'] },
    nutrition: {
      dietaryPreference: 'NO_RESTRICTION', allergies: [], dislikedFoods: [], preferredFoods: [],
      mealsPerDay: 4,
      calorieTarget: CANONICAL.targets.calories, proteinTarget: CANONICAL.targets.proteinGrams,
    },
    plan: {
      planVersion: 2, generatedAt: new Date(),
      targets: CANONICAL.targets,
      basis: { bmr: 1780, tdee: 3070, goalAdjustment: -670, proteinGramsPerKg: 1.92 },
      focusAreas: ['protein', 'calorie surplus', 'strength training', 'hydration'],
      weeklyWorkoutPlan: [], nutritionGuidelines: [],
    },
    aiPlan: { summary: 'Fixture plan', weeklyWorkoutPlan: [], nutritionGuidelines: [], dailyTargets: {} },
    createdAt: new Date(), updatedAt: new Date(),
  });

  const goals = db.collection('nutritiongoals');
  await goals.insertOne({
    id: await nextId(goals), userId: uid,
    calorieGoal: CANONICAL.targets.calories, proteinGoal: CANONICAL.targets.proteinGrams,
    carbGoal: CANONICAL.targets.carbsGrams, fatGoal: CANONICAL.targets.fatGrams,
    fiberGoal: CANONICAL.targets.fiberGrams, sugarGoal: 50,
    createdAt: new Date(), updatedAt: new Date(),
  });

  // Today's intake, split across meals so Recent Meals is populated too.
  const entries = db.collection('foodentries');
  const meals = [
    { name: 'Fixture breakfast', mealType: 'breakfast', calories: 620, protein: 40, carbs: 70, fat: 18 },
    { name: 'Fixture lunch', mealType: 'lunch', calories: 780, protein: 50, carbs: 85, fat: 22 },
    { name: 'Fixture snack', mealType: 'snack', calories: 380, protein: 25, carbs: 35, fat: 12 },
  ];
  const now = new Date();
  let eid = await nextId(entries);
  for (const m of meals) {
    await entries.insertOne({
      id: eid++, userId: uid, servingSize: '1 serving',
      ...m, fiber: 0, sugar: 0,
      entryDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9),
      createdAt: now, updatedAt: now,
    });
  }
  await entries.insertOne({
    id: eid++, userId: uid, name: 'Water', servingSize: '1900 ml', mealType: 'water',
    waterMl: CANONICAL.today.waterMl, calories: 0, protein: 0, carbs: 0, fat: 0,
    entryDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10),
    createdAt: now, updatedAt: now,
  });

  // Prior days so the weekly chart and 7-day consistency have real history.
  for (let d = 1; d <= 4; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 12);
    await entries.insertOne({
      id: eid++, userId: uid, name: `Fixture day -${d}`, servingSize: '1 serving', mealType: 'dinner',
      calories: 1900 + d * 50, protein: 120 + d, carbs: 200, fat: 60, fiber: 0, sugar: 0,
      entryDate: day, createdAt: day, updatedAt: day,
    });
  }

  // ---- Incomplete user: invalid profile, must NOT receive a plan ----
  const badUid = await createUser(db, incompleteName, `${incompleteName}@x.com`);
  await profiles.insertOne({
    id: await nextId(profiles), userId: badUid, isCompleted: true,
    // Height in feet and no biological sex — the same shape as the real
    // corrupt records. Deliberately left uncorrected.
    profile: { age: 30, heightCm: 6, weightKg: 76, activityLevel: 'MODERATE' },
    goal: { primaryGoal: 'LOSE_WEIGHT', secondaryGoals: [] },
    workout: {}, nutrition: {},
    aiPlan: {},
    createdAt: new Date(), updatedAt: new Date(),
  });

  await mongoose.disconnect();
  return { canonicalName, incompleteName, password: PASSWORD, canonicalUserId: uid, incompleteUserId: badUid };
}

if (process.argv.includes('--cleanup')) {
  const db = await connect();
  console.log(JSON.stringify(await cleanup(db)));
  await mongoose.disconnect();
  process.exit(0);
} else if (process.argv[1]?.includes('seed-fixtures')) {
  console.log(JSON.stringify(await seed()));
  process.exit(0);
}
