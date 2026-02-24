import type { Exercise, Workout, SetEntry } from "../domain/models";

export const DB_NAME = "gymlog-db";
export const DB_VERSION = 3;

const STORE_EXERCISES = "exercises";
const STORE_WORKOUTS = "workouts";
const STORE_SETS = "sets";

type GymLogDb = {
  [STORE_EXERCISES]: Exercise;
  [STORE_WORKOUTS]: Workout;
  [STORE_SETS]: SetEntry;
};

export type StoreName = keyof GymLogDb;

function getIndexedDb(): IDBFactory {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!("indexedDB" in window)) {
    throw new Error("This browser does not support IndexedDB");
  }
  return window.indexedDB;
}

/** Full exercise list for v3 (56 exercises across all body parts). */
const EXERCISES_V3: Exercise[] = [
  // ── 胸 ──────────────────────────────────────────────────
  { id: "bench-press",          name: "Bench Press",          bodyPart: "chest" },
  { id: "incline-bench",        name: "Incline Bench Press",  bodyPart: "chest" },
  { id: "decline-bench",        name: "Decline Bench Press",  bodyPart: "chest" },
  { id: "dumbbell-fly",         name: "Dumbbell Fly",         bodyPart: "chest" },
  { id: "cable-crossover",      name: "Cable Crossover",      bodyPart: "chest" },
  { id: "chest-press-machine",  name: "Chest Press Machine",  bodyPart: "chest" },
  { id: "pec-deck",             name: "Pec Deck",             bodyPart: "chest" },
  { id: "push-up",              name: "Push-Up",              bodyPart: "chest" },
  // ── 背中 ────────────────────────────────────────────────
  { id: "deadlift",             name: "Deadlift",             bodyPart: "back" },
  { id: "barbell-row",          name: "Barbell Row",          bodyPart: "back" },
  { id: "cable-row",            name: "Cable Row",            bodyPart: "back" },
  { id: "t-bar-row",            name: "T-Bar Row",            bodyPart: "back" },
  { id: "pull-up",              name: "Pull-Up",              bodyPart: "back" },
  { id: "chin-up",              name: "Chin-Up",              bodyPart: "back" },
  { id: "lat-pulldown",         name: "Lat Pulldown",         bodyPart: "back" },
  { id: "face-pull",            name: "Face Pull",            bodyPart: "back" },
  // ── 脚 ──────────────────────────────────────────────────
  { id: "back-squat",           name: "Back Squat",           bodyPart: "legs" },
  { id: "front-squat",          name: "Front Squat",          bodyPart: "legs" },
  { id: "bulgarian-split-squat",name: "Bulgarian Split Squat",bodyPart: "legs" },
  { id: "hack-squat",           name: "Hack Squat",           bodyPart: "legs" },
  { id: "sumo-squat",           name: "Sumo Squat",           bodyPart: "legs" },
  { id: "leg-press",            name: "Leg Press",            bodyPart: "legs" },
  { id: "romanian-deadlift",    name: "Romanian Deadlift",    bodyPart: "legs" },
  { id: "walking-lunge",        name: "Walking Lunge",        bodyPart: "legs" },
  { id: "leg-curl",             name: "Leg Curl",             bodyPart: "legs" },
  { id: "leg-extension",        name: "Leg Extension",        bodyPart: "legs" },
  { id: "calf-raise",           name: "Calf Raise",           bodyPart: "legs" },
  { id: "hip-thrust",           name: "Hip Thrust",           bodyPart: "legs" },
  { id: "nordic-curl",          name: "Nordic Curl",          bodyPart: "legs" },
  // ── 肩 ──────────────────────────────────────────────────
  { id: "overhead-press",       name: "Overhead Press",       bodyPart: "shoulders" },
  { id: "push-press",           name: "Push Press",           bodyPart: "shoulders" },
  { id: "db-shoulder-press",    name: "DB Shoulder Press",    bodyPart: "shoulders" },
  { id: "lateral-raise",        name: "Lateral Raise",        bodyPart: "shoulders" },
  { id: "front-raise",          name: "Front Raise",          bodyPart: "shoulders" },
  { id: "rear-delt-fly",        name: "Rear Delt Fly",        bodyPart: "shoulders" },
  { id: "cable-lateral-raise",  name: "Cable Lateral Raise",  bodyPart: "shoulders" },
  // ── 上腕二頭筋 ──────────────────────────────────────────
  { id: "barbell-curl",         name: "Barbell Curl",         bodyPart: "biceps" },
  { id: "dumbbell-curl",        name: "Dumbbell Curl",        bodyPart: "biceps" },
  { id: "hammer-curl",          name: "Hammer Curl",          bodyPart: "biceps" },
  { id: "concentration-curl",   name: "Concentration Curl",   bodyPart: "biceps" },
  { id: "cable-curl",           name: "Cable Curl",           bodyPart: "biceps" },
  { id: "preacher-curl",        name: "Preacher Curl",        bodyPart: "biceps" },
  // ── 上腕三頭筋 ──────────────────────────────────────────
  { id: "tricep-extension",     name: "Tricep Extension",     bodyPart: "triceps" },
  { id: "dip",                  name: "Dip",                  bodyPart: "triceps" },
  { id: "skull-crusher",        name: "Skull Crusher",        bodyPart: "triceps" },
  { id: "tricep-pushdown",      name: "Tricep Pushdown",      bodyPart: "triceps" },
  { id: "overhead-tricep-ext",  name: "Overhead Tricep Ext",  bodyPart: "triceps" },
  { id: "close-grip-bench",     name: "Close-Grip Bench Press", bodyPart: "triceps" },
  // ── 体幹 ────────────────────────────────────────────────
  { id: "ab-wheel",             name: "Ab Wheel",             bodyPart: "core" },
  { id: "plank",                name: "Plank",                bodyPart: "core" },
  { id: "leg-raise",            name: "Leg Raise",            bodyPart: "core" },
  { id: "hanging-leg-raise",    name: "Hanging Leg Raise",    bodyPart: "core" },
  { id: "cable-crunch",         name: "Cable Crunch",         bodyPart: "core" },
  { id: "crunches",             name: "Crunches",             bodyPart: "core" },
  { id: "dead-bug",             name: "Dead Bug",             bodyPart: "core" },
  { id: "russian-twist",        name: "Russian Twist",        bodyPart: "core" },
];

export async function openDb(): Promise<IDBDatabase> {
  const indexedDB = getIndexedDb();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      const tx = (event.target as IDBOpenDBRequest).transaction!;

      // Create object stores if they don't exist.
      let exerciseStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_EXERCISES)) {
        exerciseStore = db.createObjectStore(STORE_EXERCISES, {
          keyPath: "id",
        });
        exerciseStore.createIndex("by_bodyPart", "bodyPart", {
          unique: false,
        });
      } else {
        exerciseStore = tx.objectStore(STORE_EXERCISES);
      }

      if (!db.objectStoreNames.contains(STORE_WORKOUTS)) {
        const store = db.createObjectStore(STORE_WORKOUTS, {
          keyPath: "id",
        });
        store.createIndex("by_startedAt", "startedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SETS)) {
        const store = db.createObjectStore(STORE_SETS, {
          keyPath: "id",
        });
        store.createIndex("by_workoutId", "workoutId", { unique: false });
        store.createIndex("by_exerciseId", "exerciseId", { unique: false });
      }

      // v2: original 27 exercises (kept for upgrade paths from v1).
      if (oldVersion < 2) {
        const exercisesV2: Exercise[] = [
          { id: "bench-press",      name: "Bench Press",          bodyPart: "chest" },
          { id: "incline-bench",    name: "Incline Bench Press",  bodyPart: "chest" },
          { id: "dumbbell-fly",     name: "Dumbbell Fly",         bodyPart: "chest" },
          { id: "push-up",          name: "Push-Up",              bodyPart: "chest" },
          { id: "deadlift",         name: "Deadlift",             bodyPart: "back" },
          { id: "barbell-row",      name: "Barbell Row",          bodyPart: "back" },
          { id: "pull-up",          name: "Pull-Up",              bodyPart: "back" },
          { id: "lat-pulldown",     name: "Lat Pulldown",         bodyPart: "back" },
          { id: "back-squat",       name: "Back Squat",           bodyPart: "legs" },
          { id: "front-squat",      name: "Front Squat",          bodyPart: "legs" },
          { id: "leg-press",        name: "Leg Press",            bodyPart: "legs" },
          { id: "leg-curl",         name: "Leg Curl",             bodyPart: "legs" },
          { id: "leg-extension",    name: "Leg Extension",        bodyPart: "legs" },
          { id: "calf-raise",       name: "Calf Raise",           bodyPart: "legs" },
          { id: "hip-thrust",       name: "Hip Thrust",           bodyPart: "legs" },
          { id: "overhead-press",   name: "Overhead Press",       bodyPart: "shoulders" },
          { id: "push-press",       name: "Push Press",           bodyPart: "shoulders" },
          { id: "lateral-raise",    name: "Lateral Raise",        bodyPart: "shoulders" },
          { id: "barbell-curl",     name: "Barbell Curl",         bodyPart: "biceps" },
          { id: "dumbbell-curl",    name: "Dumbbell Curl",        bodyPart: "biceps" },
          { id: "hammer-curl",      name: "Hammer Curl",          bodyPart: "biceps" },
          { id: "tricep-extension", name: "Tricep Extension",     bodyPart: "triceps" },
          { id: "dip",              name: "Dip",                  bodyPart: "triceps" },
          { id: "skull-crusher",    name: "Skull Crusher",        bodyPart: "triceps" },
          { id: "ab-wheel",         name: "Ab Wheel",             bodyPart: "core" },
          { id: "plank",            name: "Plank",                bodyPart: "core" },
          { id: "leg-raise",        name: "Leg Raise",            bodyPart: "core" },
        ];

        // Clear existing exercises if upgrading from v1.
        if (oldVersion >= 1) {
          exerciseStore.clear();
        }

        for (const exercise of exercisesV2) {
          exerciseStore.add(exercise);
        }
      }

      // v3: expanded exercise list (56 exercises). Clear and re-seed.
      if (oldVersion < 3) {
        exerciseStore.clear();
        for (const exercise of EXERCISES_V3) {
          exerciseStore.add(exercise);
        }
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

export async function withStore<TStore extends StoreName, TResult>(
  storeName: TStore,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<TResult> | TResult,
): Promise<TResult> {
  const db = await openDb();

  return new Promise<TResult>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let resultPromise: Promise<TResult>;
    try {
      resultPromise = Promise.resolve(fn(store));
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }

    resultPromise
      .then((result) => {
        tx.oncomplete = () => {
          resolve(result);
        };
      })
      .catch((error) => {
        tx.abort();
        reject(error);
      });

    tx.onerror = () => {
      reject(tx.error ?? new Error("IndexedDB transaction error"));
    };
  });
}


export const stores = {
  EXERCISES: STORE_EXERCISES,
  WORKOUTS: STORE_WORKOUTS,
  SETS: STORE_SETS,
} as const;
