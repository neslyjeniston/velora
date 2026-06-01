import { useState } from 'react';
import { useHabits } from '@/context/HabitContext';
import { Plus, X, Flame, TrendingUp, Target, Award, CheckCircle2, Circle, Sparkles, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DailyView() {
  const { habits, addHabit, removeHabit, toggleCompletion, isCompleted, getHabitStats, getMonthlyStats, selectedDate } = useHabits();
  const [newHabit, setNewHabit] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [viewingHabit, setViewingHabit] = useState<string | null>(null);
  const [affirmation, setAffirmation] = useState(() => localStorage.getItem('stride-affirmation') || '');

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyHabits = habits.filter(h => h.category === 'daily');
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long' });
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const currentDay = today.getDate();

  const monthlyStats = getMonthlyStats(monthStr);
  const todayDateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const todayHabits = dailyHabits.map(h => ({
    ...h,
    completed: isCompleted(h.id, todayDateStr),
    stats: getHabitStats(h.id, monthStr)
  }));

  const todayCompleted = todayHabits.filter(h => h.completed).length;
  const todayTotal = todayHabits.length;
  const todayPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const todayPending = todayTotal - todayCompleted;

  const handleAdd = () => {
    if (newHabit.trim()) {
      addHabit(newHabit.trim(), 'daily');
      setNewHabit('');
      setShowInput(false);
    }
  };

  const saveAffirmation = (val: string) => {
    setAffirmation(val);
    localStorage.setItem('stride-affirmation', val);
  };

  const habitStatsArr = dailyHabits.map(h => ({ habit: h, stats: getHabitStats(h.id, monthStr) }));

  // Maintain insertion order — do NOT sort
  const todayHabitsRanked = todayHabits.map(h => ({
    ...h,
    rank: h.stats.percentage >= 90 ? 'gold' : h.stats.percentage >= 70 ? 'silver' : h.stats.percentage >= 50 ? 'bronze' : 'starter'
  }));

  const dailyRateData = Array.from({ length: Math.min(currentDay, daysInMonth) }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let done = 0;
    dailyHabits.forEach(h => { if (isCompleted(h.id, dateStr)) done++; });
    const total = dailyHabits.length;
    return { day, completed: done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const getWeekOfMonth = (day: number) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    return Math.ceil((day + firstDay) / 7);
  };

  const weeklyBreakdown: { week: number; completed: number; total: number; pct: number }[] = [];
  const currentWeek = getWeekOfMonth(currentDay);
  for (let w = 1; w <= currentWeek; w++) {
    let completed = 0, total = 0;
    for (let d = 1; d <= Math.min(currentDay, daysInMonth); d++) {
      if (getWeekOfMonth(d) === w) {
        dailyHabits.forEach(h => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          total++;
          if (isCompleted(h.id, dateStr)) completed++;
        });
      }
    }
    if (total > 0) weeklyBreakdown.push({ week: w, completed, total, pct: Math.round((completed / total) * 100) });
  }

  const perfectDays = dailyRateData.filter(d => d.percentage === 100).length;
  const zeroDays = dailyRateData.filter(d => d.completed === 0 && dailyHabits.length > 0).length;
  const avgPct = currentDay > 0 && dailyHabits.length > 0
    ? Math.round(dailyRateData.reduce((s, d) => s + d.percentage, 0) / dailyRateData.length) : 0;
  const bestHabit = habitStatsArr.length > 0 ? habitStatsArr.reduce((best, h) => h.stats.percentage > best.stats.percentage ? h : best) : null;
  const worstHabit = habitStatsArr.length > 0 ? habitStatsArr.reduce((worst, h) => h.stats.percentage < worst.stats.percentage ? h : worst) : null;

  const weeklyChartData = weeklyBreakdown.map(w => ({ name: `W${w.week}`, percentage: w.pct, completed: w.completed }));

  const getStreakMessage = () => {
    if (todayPercentage === 100) return { text: '🔥 Perfect day! Keep the streak alive!', color: 'text-habit-complete' };
    if (todayPercentage >= 75) return { text: '💪 Great progress! Almost there!', color: 'text-primary' };
    if (todayPercentage >= 50) return { text: '📈 Halfway there! Push through!', color: 'text-accent' };
    if (todayPercentage > 0) return { text: '⏳ Keep going! Every habit counts!', color: 'text-muted-foreground' };
    return { text: '🌟 Start your day strong! Begin with one habit.', color: 'text-muted-foreground' };
  };
  const streakMsg = getStreakMessage();

  const viewHabit = viewingHabit ? dailyHabits.find(h => h.id === viewingHabit) : null;
  const viewStats = viewHabit ? getHabitStats(viewHabit.id, monthStr) : null;
  const viewDayData = viewHabit ? Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, completed: isCompleted(viewHabit.id, dateStr) };
  }) : [];
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-border p-6 md:p-8">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">{todayFormatted}</p>
            <h2 className="text-3xl md:text-4xl font-display text-foreground mt-2">Today's Focus</h2>
            <p className={`text-sm mt-3 font-medium ${streakMsg.color}`}>{streakMsg.text}</p>
          </div>
          <div>
            <div className="flex items-end justify-between mb-3">
              <p className="text-6xl md:text-7xl font-bold text-foreground leading-none">{todayPercentage}<span className="text-2xl text-muted-foreground">%</span></p>
              <p className="text-sm text-muted-foreground">{todayCompleted}/{todayTotal} done</p>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" initial={{ width: 0 }} animate={{ width: `${todayPercentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Even 4-stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label="Pending" value={todayPending} icon={<Circle size={16} />} color="text-muted-foreground" />
        <StatPill label="Done Today" value={todayCompleted} icon={<CheckCircle2 size={16} />} color="text-habit-complete" />
        <StatPill label="Best Streak" value={`${monthlyStats.longestStreak}d`} icon={<Flame size={16} />} color="text-habit-streak" />
        <StatPill label="Active Habits" value={todayTotal} icon={<Target size={16} />} color="text-primary" />
      </div>

      {/* Even insights row */}
      {dailyHabits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InsightMini label="Perfect Days" value={String(perfectDays)} icon={<Award size={14} />} />
          <InsightMini label="Avg Daily" value={`${avgPct}%`} icon={<TrendingUp size={14} />} />
          <InsightMini label="Month Rate" value={`${monthlyStats.percentage}%`} icon={<Target size={14} />} />
          <InsightMini label="Zero Days" value={String(zeroDays)} icon={<Circle size={14} />} color={zeroDays === 0 ? 'text-habit-complete' : 'text-destructive'} />
        </div>
      )}

      {/* Visual Affirmation - Top */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5 border border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase whitespace-nowrap">Visual Affirmation</p>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-display italic text-foreground whitespace-nowrap">I am...</span>
            <input value={affirmation} onChange={e => saveAffirmation(e.target.value)} placeholder="focused, ready" className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      {/* Star Habit & Needs Attention - Above Today's Habits */}
      {(bestHabit || (worstHabit && worstHabit.stats.percentage < 50 && worstHabit.stats.totalPossible > 5)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestHabit && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary tracking-wider uppercase mb-1">⭐ Star Habit</p>
              <p className="font-medium text-foreground truncate">{bestHabit.habit.name}</p>
              <p className="text-xs text-muted-foreground">{bestHabit.stats.percentage}% • {bestHabit.stats.longestStreak}d best streak</p>
            </div>
          )}
          {worstHabit && worstHabit.stats.percentage < 50 && worstHabit.stats.totalPossible > 5 && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-medium text-destructive tracking-wider uppercase mb-1">⚠️ Needs Attention</p>
              <p className="font-medium text-foreground truncate">{worstHabit.habit.name}</p>
              <p className="text-xs text-muted-foreground">Only {worstHabit.stats.percentage}% completion rate</p>
            </div>
          )}
        </div>
      )}

      {/* Today's Habits - Full Width Horizontal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">Today's Habits</p>
          <button onClick={() => setShowInput(!showInput)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} /> Add Habit
          </button>
        </div>

        <AnimatePresence>
          {showInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex gap-2 p-4 rounded-xl bg-card border border-border">
                <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g., Read 30 minutes" className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
                <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Add</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {todayHabits.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
            <p className="text-lg mb-2 text-foreground">No habits yet</p>
            <p className="text-sm text-muted-foreground">Add your first habit to start tracking today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {todayHabitsRanked.map((habit, idx) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border transition-all ${habit.completed ? 'bg-habit-complete/10 border-habit-complete/30' : 'bg-card border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCompletion(habit.id, todayDateStr)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${habit.completed ? 'bg-habit-complete text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}
                  >
                    {habit.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${habit.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{habit.name}</p>
                      {habit.rank === 'gold' && <span className="text-xs">🏆</span>}
                      {habit.rank === 'silver' && <span className="text-xs">🥈</span>}
                      {habit.rank === 'bronze' && <span className="text-xs">🥉</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Flame size={12} /><span>{habit.stats.longestStreak}d</span></div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp size={12} /><span>{habit.stats.percentage}%</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => setViewingHabit(habit.id)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="View monthly progress">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => removeHabit(habit.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Charts: even 2-column */}
      {dailyHabits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium mb-4">Daily Completion Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyRateData}>
                <defs>
                  <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`${value}%`, 'Completion']} labelFormatter={(label) => `Day ${label}`} />
                <Area type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPct)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium mb-4">Weekly Performance</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`${value}%`, 'Rate']} />
                <Bar dataKey="percentage" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Dialog open={!!viewingHabit} onOpenChange={(open) => !open && setViewingHabit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{viewHabit?.name} — {monthName} Progress</DialogTitle>
          </DialogHeader>
          {viewStats && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{viewStats.percentage}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Completion</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{viewStats.longestStreak}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Best Streak</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{viewStats.currentStreak}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</p>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`empty-${i}`} />)}
                  {viewDayData.map(d => {
                    const isToday = isCurrentMonth && d.day === currentDay;
                    const isFuture = isCurrentMonth && d.day > currentDay;
                    return (
                      <button
                        key={d.day}
                        onClick={() => viewHabit && toggleCompletion(viewHabit.id, `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`)}
                        disabled={isFuture}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                          isFuture ? 'text-muted-foreground/30 cursor-not-allowed' :
                          d.completed ? 'bg-habit-complete text-white' :
                          isToday ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                          'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {d.day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{viewStats.totalCompleted} of {viewStats.totalPossible} days</span>
                  <span>{viewStats.percentage}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${viewStats.percentage}%` }} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatPill({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
      <span className={`${color} flex-shrink-0`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      </div>
    </div>
  );
}

function InsightMini({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border">
      <span className={color || 'text-muted-foreground'}>{icon}</span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold truncate ${color || 'text-foreground'}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
