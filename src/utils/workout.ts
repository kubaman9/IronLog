export const WORKOUT_KEY = 'ironlog_workout'

export type WorkoutExercise = {
    id: string
    name: string
    type: string
    weight: number
    reps: number
    sets: number
    completedSets: boolean[]
    isPlaceholder?: boolean
    liftId?: string  // DB _id — set when created from a real lift
    startedAt?: number    // timestamp of first set checked
    completedAt?: number  // timestamp when all sets done
}

export type ActiveWorkout = {
    exercises: WorkoutExercise[]
    startTime: number
    totalMinutes: number
    muscleGroups: string[]
    mode?: 'planned' | 'on-the-go'
}

export const PLACEHOLDERS: Record<string, { name: string; weight: number; reps: number }[]> = {
    Chest:     [{ name: 'Push-Up', weight: 0, reps: 12 }, { name: 'Dumbbell Fly', weight: 25, reps: 10 }, { name: 'Incline Press', weight: 95, reps: 8 }, { name: 'Cable Fly', weight: 30, reps: 12 }],
    Tricept:   [{ name: 'Tricep Extension', weight: 30, reps: 12 }, { name: 'Skull Crusher', weight: 40, reps: 10 }, { name: 'Tricep Dip', weight: 0, reps: 10 }, { name: 'Cable Pushdown', weight: 35, reps: 12 }],
    Bicept:    [{ name: 'Bicep Curl', weight: 25, reps: 12 }, { name: 'Hammer Curl', weight: 20, reps: 12 }, { name: 'Preacher Curl', weight: 30, reps: 10 }, { name: 'Cable Curl', weight: 35, reps: 12 }],
    Shoulders: [{ name: 'Shoulder Press', weight: 40, reps: 10 }, { name: 'Lateral Raise', weight: 15, reps: 12 }, { name: 'Front Raise', weight: 15, reps: 12 }, { name: 'Face Pull', weight: 25, reps: 15 }],
    Back:      [{ name: 'Pull-Up', weight: 0, reps: 8 }, { name: 'Bent-Over Row', weight: 95, reps: 10 }, { name: 'Lat Pulldown', weight: 80, reps: 10 }, { name: 'Seated Row', weight: 85, reps: 10 }],
    Abbs:      [{ name: 'Crunch', weight: 0, reps: 15 }, { name: 'Plank Hold', weight: 0, reps: 1 }, { name: 'Russian Twist', weight: 20, reps: 20 }, { name: 'Leg Raise', weight: 0, reps: 12 }],
    Legs:      [{ name: 'Bodyweight Squat', weight: 0, reps: 15 }, { name: 'Lunge', weight: 0, reps: 12 }, { name: 'Calf Raise', weight: 0, reps: 20 }, { name: 'Glute Bridge', weight: 0, reps: 15 }],
    Forearms:  [{ name: 'Wrist Curl', weight: 15, reps: 15 }, { name: 'Reverse Curl', weight: 20, reps: 12 }, { name: 'Farmer Hold', weight: 40, reps: 1 }, { name: 'Dead Hang', weight: 0, reps: 1 }],
}

// Display-safe muscle type names (stored values have historical typos)
const TYPE_DISPLAY: Record<string, string> = {
    Bicept: 'Bicep', Tricept: 'Tricep', Abbs: 'Abs',
}
export const displayType = (t: string): string => TYPE_DISPLAY[t] || t

export const makeId = () => Math.random().toString(36).slice(2, 10)

export const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
