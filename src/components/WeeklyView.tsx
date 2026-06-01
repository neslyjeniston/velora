import { useState } from 'react';
import { useHabits } from '@/context/HabitContext';
import { Plus, X, CheckCircle2, Circle, TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

function getWeekOfMonth(day: number, year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  return Math.ceil((day + firstDay) / 7);
}

const weekBgClasses = ['', 'bg-week-1', 'bg-week-2', 'bg-week-3', 'bg-week-4', 'bg-week-5'];

export default function WeeklyView() {
  const { habits, isCompleted, selectedDate } = useHabits();
  const [newHabit, setNewHabit] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [weeklyHabits, setWeeklyHabits] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('stride-special-habits');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [completions, setCompletions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('stride-special-completions');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const dailyHabits = habits.filter(h => h.category === 'daily');
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long' });
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const getWeeks = () => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      currentWeek.push(date);
      if (date.getDay() === 6 || d === daysInMonth) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  };

  const weeks = getWeeks();

  const weeklyConsolidation: { week: number; pct: number; completed: number; total: number }[] = [];
  for (let w = 1; w <= 5; w++) {
    let completed = 0, total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (getWeekOfMonth(d, year, month) === w) {
        dailyHabits.forEach(h => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          total++;
          if (isCompleted(h.id, dateStr)) completed++;
        });
      }
    }
    if (total > 0) weeklyConsolidation.push({ week: w, pct: Math.round((completed / total) * 100), completed, total });
  }
  const aggCompleted = weeklyConsolidation.reduce((s, w) => s + w.completed, 0);
  const aggTotal = weeklyConsolidation.reduce((s, w) => s + w.total, 0);
  const aggPct = aggTotal > 0 ? Math.round((aggCompleted / aggTotal) * 100) : 0;

  const handleAdd = () => {
    if (newHabit.trim()) {
      const updated = [...weeklyHabits, { id: crypto.randomUUID(), name: newHabit.trim() }];
      setWeeklyHabits(updated);
      localStorage.setItem('stride-special-habits', JSON.stringify(updated));
      setNewHabit('');
      setShowInput(false);
    }
  };

  const removeHabit = (id: string) => {
    const updated = weeklyHabits.filter(h => h.id !== id);
    setWeeklyHabits(updated);
    localStorage.setItem('stride-special-habits', JSON.stringify(updated));
    const comps = { ...completions };
    delete comps[id];
    setCompletions(comps);
    localStorage.setItem('stride-special-completions', JSON.stringify(comps));
  };

  const toggleCompletion = (habitId: string, weekIdx: number) => {
    const key = `${habitId}-${monthStr}-${weekIdx}`;
    const comps = { ...completions };
    if (!comps[habitId]) comps[habitId] = [];
    if (comps[habitId].includes(key)) {
      comps[habitId] = comps[habitId].filter(k => k !== key);
    } else {
      comps[habitId] = [...comps[habitId], key];
    }
    setCompletions(comps);
    localStorage.setItem('stride-special-completions', JSON.stringify(comps));
  };

  const isHabitCompleted = (habitId: string, weekIdx: number) => {
    const key = `${habitId}-${monthStr}-${weekIdx}`;
    return completions[habitId]?.includes(key) || false;
  };

  const totalHabits = weeklyHabits.length * weeks.length;
  let totalCompleted = 0;
  let totalIncomplete = 0;
  weeklyHabits.forEach(h => {
    weeks.forEach((_, i) => {
      if (isHabitCompleted(h.id, i)) totalCompleted++;
      else totalIncomplete++;
    });
  });
  const completionPct = totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) : 0;

  const chartData = weeks.map((_, i) => {
    let done = 0;
    weeklyHabits.forEach(h => { if (isHabitCompleted(h.id, i)) done++; });
    return { name: `Week ${i + 1}`, completed: done, total: weeklyHabits.length };
  });

  const radialData = [{ name: 'Progress', value: completionPct, fill: 'hsl(var(--primary))' }];
  const bestWeek = chartData.reduce((b, w) => w.completed > b.completed ? w : b, chartData[0] || { name: '—', completed: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display text-foreground">Weekly Habits</h2>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium mt-1">{monthName} {year}</p>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus size={16} /> Add Weekly Habit
        </button>
      </div>

      {/* Stats overview - even grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Completion" value={`${completionPct}%`} icon={<TrendingUp size={16} />} accent />
        <StatCard label="Done" value={String(totalCompleted)} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Pending" value={String(totalIncomplete)} icon={<Circle size={16} />} />
        <StatCard label="Habits" value={String(weeklyHabits.length)} icon={<Target size={16} />} />
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2 p-4 rounded-xl bg-card border border-border">
              <input
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="e.g., Deep clean house, Meal prep"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Add</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Habits Weekly Consolidation */}
      {dailyHabits.length > 0 && weeklyConsolidation.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">Daily Habits — Weekly Consolidation</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {weeklyConsolidation.map(wp => (
              <div key={wp.week} className={`rounded-xl p-3 text-center ${weekBgClasses[wp.week]} border border-border/50`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Week {wp.week}</p>
                <p className="text-xl font-bold text-foreground mt-1">{wp.pct}%</p>
                <p className="text-[10px] text-muted-foreground">{wp.completed}/{wp.total}</p>
              </div>
            ))}
            <div className="rounded-xl p-3 text-center bg-primary/10 border border-primary/30">
              <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Total</p>
              <p className="text-xl font-bold text-foreground mt-1">{aggPct}%</p>
              <p className="text-[10px] text-muted-foreground">{aggCompleted}/{aggTotal}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main grid - habits table + visual sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Habits table */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">Special Weekly Habits</p>
          {weeklyHabits.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground rounded-xl border border-dashed border-border">
              <p className="text-lg mb-2">No weekly habits yet</p>
              <p className="text-sm">Add habits done on specific weeks (e.g., meal prep)</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="bg-card">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground min-w-[180px]">Habit</th>
                      {weeks.map((_, i) => (
                        <th key={i} className={`p-3 text-center text-xs font-medium ${weekBgClasses[i + 1] || ''}`}>
                          <span className="uppercase tracking-wider text-foreground">W{i + 1}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyHabits.map((habit, idx) => (
                      <motion.tr
                        key={habit.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-t border-border hover:bg-muted/30 transition-colors group"
                      >
                        <td className="p-3 text-sm font-medium text-foreground">
                          <div className="flex items-center justify-between">
                            <span>{habit.name}</span>
                            <button onClick={() => removeHabit(habit.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 ml-2">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                        {weeks.map((_, i) => {
                          const done = isHabitCompleted(habit.id, i);
                          return (
                            <td key={i} className={`p-3 text-center ${weekBgClasses[i + 1] || ''}`}>
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleCompletion(habit.id, i)} className="inline-flex items-center justify-center">
                                {done ? <CheckCircle2 size={22} className="text-habit-complete" /> : <Circle size={22} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />}
                              </motion.button>
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {weeklyHabits.map((habit, idx) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-foreground">{habit.name}</p>
                      <button onClick={() => removeHabit(habit.id)} className="text-muted-foreground hover:text-destructive">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {weeks.map((_, i) => {
                        const done = isHabitCompleted(habit.id, i);
                        return (
                          <button
                            key={i}
                            onClick={() => toggleCompletion(habit.id, i)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-medium ${weekBgClasses[i + 1]} ${done ? 'ring-2 ring-habit-complete' : ''}`}
                          >
                            <span className="text-muted-foreground">W{i + 1}</span>
                            {done ? <CheckCircle2 size={16} className="text-habit-complete mt-1" /> : <Circle size={16} className="text-muted-foreground/40 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar with radial + chart */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border">
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium mb-2">Overall Progress</p>
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: '28px', fontWeight: 'bold' }}>
                  {completionPct}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2 text-center">
              <div className="p-2 rounded-lg bg-background/60">
                <p className="text-xs text-muted-foreground">Best Week</p>
                <p className="text-sm font-semibold text-foreground">{bestWeek?.name || '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-background/60">
                <p className="text-xs text-muted-foreground">Top Score</p>
                <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1"><Award size={12} />{bestWeek?.completed || 0}</p>
              </div>
            </div>
          </div>

          {weeklyHabits.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium mb-3 flex items-center gap-2"><Calendar size={12} /> Weekly Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl border ${accent ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
}
