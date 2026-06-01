import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit, HabitCompletion, MonthlyReflection, HabitStats } from '@/types/habit';
import { useAuth } from '@/context/AuthContext';

interface HabitContextType {
  habits: Habit[];
  completions: HabitCompletion[];
  reflections: MonthlyReflection[];
  addHabit: (name: string, category: 'daily' | 'weekly') => void;
  removeHabit: (id: string) => void;
  toggleCompletion: (habitId: string, date: string) => void;
  isCompleted: (habitId: string, date: string) => boolean;
  getHabitStats: (habitId: string, month: string) => HabitStats;
  getMonthlyStats: (month: string) => HabitStats;
  getYearlyStats: (year: number) => { month: string; stats: HabitStats }[];
  saveReflection: (month: string, reflection: string, affirmation: string) => void;
  getReflection: (month: string) => MonthlyReflection | undefined;
  clearAllData: () => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const HabitContext = createContext<HabitContextType | null>(null);

const STORAGE_KEYS = {
  habits: 'habit-tracker-habits',
  completions: 'habit-tracker-completions',
  reflections: 'habit-tracker-reflections',
};

function storageKey(base: string, userId?: string) {
  return userId ? `${base}::${userId}` : base;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const habitsKey = storageKey(STORAGE_KEYS.habits, userId);
  const completionsKey = storageKey(STORAGE_KEYS.completions, userId);
  const reflectionsKey = storageKey(STORAGE_KEYS.reflections, userId);

  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage(habitsKey, []));
  const [completions, setCompletions] = useState<HabitCompletion[]>(() => loadFromStorage(completionsKey, []));
  const [reflections, setReflections] = useState<MonthlyReflection[]>(() => loadFromStorage(reflectionsKey, []));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchHabits = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/habits",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    const formattedHabits = data.map((habit: any) => ({
      id: habit._id,
      name: habit.name,
      category: habit.category,
      createdAt: habit.createdAt,
    }));

    setHabits(formattedHabits);
  } catch (err) {
    console.error(err);
  }
};

const fetchCompletions = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/completions",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setCompletions(data);
  } catch (err) {
    console.error(err);
  }
};

const fetchReflections = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/reflections",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setReflections(data);
  } catch (err) {
    console.error(err);
  }
};

  // Reload data whenever the active user changes (login/logout/switch).
  useEffect(() => {
  if (user) {
    fetchHabits();
    fetchCompletions();
    fetchReflections();
  }
}, [user]);

  useEffect(() => { localStorage.setItem(habitsKey, JSON.stringify(habits)); }, [habits, habitsKey]);
  useEffect(() => { localStorage.setItem(completionsKey, JSON.stringify(completions)); }, [completions, completionsKey]);
  useEffect(() => { localStorage.setItem(reflectionsKey, JSON.stringify(reflections)); }, [reflections, reflectionsKey]);

  const addHabit = useCallback(
  async (
    name: string,
    category: "daily" | "weekly"
  ) => {
    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/habits",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            category,
          }),
        }
      );

      const newHabit =
  await response.json();

const habitForUI = {
  id: newHabit._id,
  name: newHabit.name,
  category: newHabit.category,
  createdAt: newHabit.createdAt,
};

setHabits(prev => [
  ...prev,
  habitForUI,
]);
    } catch (err) {
      console.error(err);
    }
  },
  []
);

  const removeHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setCompletions(prev => prev.filter(c => c.habitId !== id));
  }, []);

  const toggleCompletion = useCallback(
  async (habitId: string, date: string) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/completions/toggle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            habitId,
            date,
          }),
        }
      );

      const data = await response.json();

      if (data.completed) {
        setCompletions(prev => [
          ...prev,
          {
            habitId,
            date,
            completed: true,
          },
        ]);
      } else {
        setCompletions(prev =>
          prev.filter(
            c =>
              !(
                c.habitId === habitId &&
                c.date === date
              )
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  },
  []
);

  const isCompleted = useCallback((habitId: string, date: string) => {
    return completions.some(c => c.habitId === habitId && c.date === date && c.completed);
  }, [completions]);

  const getHabitStats = useCallback((habitId: string, month: string): HabitStats => {
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return { totalCompleted: 0, totalPossible: 0, percentage: 0, longestStreak: 0, currentStreak: 0 };

    const totalPossible = habit.category === 'daily' ? daysInMonth : Math.ceil(daysInMonth / 7);
    let totalCompleted = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isCompleted(habitId, dateStr)) {
        totalCompleted++;
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return {
      totalCompleted, totalPossible,
      percentage: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      longestStreak, currentStreak,
    };
  }, [habits, isCompleted]);

  const getMonthlyStats = useCallback((month: string): HabitStats => {
    const dailyHabits = habits.filter(h => h.category === 'daily');
    if (dailyHabits.length === 0) return { totalCompleted: 0, totalPossible: 0, percentage: 0, longestStreak: 0, currentStreak: 0 };

    let totalCompleted = 0;
    let totalPossible = 0;
    let maxStreak = 0;

    dailyHabits.forEach(h => {
      const stats = getHabitStats(h.id, month);
      totalCompleted += stats.totalCompleted;
      totalPossible += stats.totalPossible;
      maxStreak = Math.max(maxStreak, stats.longestStreak);
    });

    return {
      totalCompleted, totalPossible,
      percentage: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      longestStreak: maxStreak, currentStreak: 0,
    };
  }, [habits, getHabitStats]);

  const getYearlyStats = useCallback((year: number) => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, '0')}`;
      return { month, stats: getMonthlyStats(month) };
    });
  }, [getMonthlyStats]);

  const saveReflection = useCallback(
  async (
    month: string,
    reflection: string,
    affirmation: string
  ) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/reflections",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            month,
            reflection,
            affirmation,
          }),
        }
      );

      const data = await response.json();

      setReflections(prev => {
        const existing = prev.findIndex(
          r => r.month === month
        );

        const entry = {
          month: data.month,
          reflection: data.reflection,
          affirmation: data.affirmation,
        };

        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = entry;
          return updated;
        }

        return [...prev, entry];
      });
    } catch (err) {
      console.error(err);
    }
  },
  []
);

  const getReflection = useCallback((month: string) => {
    return reflections.find(r => r.month === month);
  }, [reflections]);

  const clearAllData = useCallback(() => {
    setHabits([]);
    setCompletions([]);
    setReflections([]);
  }, []);

  return (
    <HabitContext.Provider value={{
      habits, completions, reflections, addHabit, removeHabit, toggleCompletion,
      isCompleted, getHabitStats, getMonthlyStats, getYearlyStats,
      saveReflection, getReflection, clearAllData, selectedDate, setSelectedDate,
    }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}
