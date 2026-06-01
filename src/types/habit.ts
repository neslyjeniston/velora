export interface Habit {
  id: string;
  name: string;
  category: 'daily' | 'weekly';
  createdAt: string;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface MonthlyReflection {
  month: string; // YYYY-MM
  reflection: string;
  affirmation: string;
}

export interface HabitStats {
  totalCompleted: number;
  totalPossible: number;
  percentage: number;
  longestStreak: number;
  currentStreak: number;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';
