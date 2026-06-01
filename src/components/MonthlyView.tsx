import { useState, useEffect } from 'react';
import { useHabits } from '@/context/HabitContext';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Plus, X, CheckCircle2, Circle, Download, Target, Flame, Award, TrendingUp, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyHabit {
  id: string;
  name: string;
  completed: boolean;
}

function loadMonthlyHabits(monthStr: string): MonthlyHabit[] {
  try {
    const stored = localStorage.getItem(`velora-monthly-habits-${monthStr}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveMonthlyHabits(monthStr: string, habits: MonthlyHabit[]) {
  localStorage.setItem(`velora-monthly-habits-${monthStr}`, JSON.stringify(habits));
}

export default function MonthlyView() {
  const { habits, getHabitStats, getMonthlyStats, saveReflection, getReflection, selectedDate, isCompleted } = useHabits();

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month, 0).getDate();

  const stats = getMonthlyStats(monthStr);
  const dailyHabits = habits.filter(h => h.category === 'daily');
  const reflection = getReflection(monthStr);

  const [reflectionText, setReflectionText] = useState(reflection?.reflection || '');
  const [affirmation, setAffirmation] = useState(reflection?.affirmation || '');
  const [monthlyHabits, setMonthlyHabits] = useState<MonthlyHabit[]>(() => loadMonthlyHabits(monthStr));
  const [newMonthlyHabit, setNewMonthlyHabit] = useState('');

  useEffect(() => {
    const r = getReflection(monthStr);
    setReflectionText(r?.reflection || '');
    setAffirmation(r?.affirmation || '');
    setMonthlyHabits(loadMonthlyHabits(monthStr));
  }, [monthStr, getReflection]);

  const handleSaveReflection = () => saveReflection(monthStr, reflectionText, affirmation);

  const addMonthlyHabit = () => {
    if (newMonthlyHabit.trim()) {
      const updated = [...monthlyHabits, { id: crypto.randomUUID(), name: newMonthlyHabit.trim(), completed: false }];
      setMonthlyHabits(updated);
      saveMonthlyHabits(monthStr, updated);
      setNewMonthlyHabit('');
    }
  };

  const toggleMonthlyHabit = (id: string) => {
    const updated = monthlyHabits.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
    setMonthlyHabits(updated);
    saveMonthlyHabits(monthStr, updated);
  };

  const removeMonthlyHabit = (id: string) => {
    const updated = monthlyHabits.filter(h => h.id !== id);
    setMonthlyHabits(updated);
    saveMonthlyHabits(monthStr, updated);
  };

  const monthlyCompleted = monthlyHabits.filter(h => h.completed).length;
  const monthlyTotal = monthlyHabits.length;
  const monthlyPct = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

  const habitStatsArr = dailyHabits.map(h => ({ habit: h, ...getHabitStats(h.id, monthStr) }));
  const topHabits = [...habitStatsArr].sort((a, b) => b.percentage - a.percentage).slice(0, 10);
  const chartData = topHabits.map(h => ({
    name: h.habit.name.length > 14 ? h.habit.name.slice(0, 14) + '…' : h.habit.name,
    completion: h.percentage,
  }));

  // Perfect days
  let perfectDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dailyHabits.length > 0 && dailyHabits.every(h => isCompleted(h.id, dateStr))) perfectDays++;
  }
  const starHabit = habitStatsArr.length ? habitStatsArr.reduce((b, h) => h.percentage > b.percentage ? h : b) : null;

  const radialData = [{ name: 'Progress', value: stats.percentage, fill: 'hsl(var(--primary))' }];

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(245, 230, 211);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(22);
    doc.setTextColor(40, 30, 20);
    doc.text('Velora — Monthly Report', 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(100, 90, 80);
    doc.text(monthName, 14, 27);

    let y = 48;

    // Brief consolidation
    doc.setFontSize(14);
    doc.setTextColor(40, 30, 20);
    doc.text('Brief Consolidation', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 50, 40);
    const summary = [
      `Overall completion: ${stats.percentage}% (${stats.totalCompleted}/${stats.totalPossible})`,
      `Best streak: ${stats.longestStreak} days`,
      `Active daily habits: ${dailyHabits.length}`,
      `Monthly goals: ${monthlyCompleted}/${monthlyTotal} completed (${monthlyPct}%)`,
      `Perfect days: ${perfectDays}`,
      starHabit ? `Star habit: ${starHabit.habit.name} (${starHabit.percentage}%)` : '',
    ].filter(Boolean);
    summary.forEach(s => { doc.text(s, 14, y); y += 6; });

    y += 4;

    // Daily habits table
    if (habitStatsArr.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Daily Habit', 'Completed', 'Possible', '%', 'Best Streak']],
        body: habitStatsArr.map(h => [h.habit.name, String(h.totalCompleted), String(h.totalPossible), `${h.percentage}%`, `${h.longestStreak}d`]),
        headStyles: { fillColor: [204, 102, 51], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Monthly goals table
    if (monthlyHabits.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 30, 20);
      doc.text('Monthly Goals', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Goal', 'Status']],
        body: monthlyHabits.map(h => [h.name, h.completed ? '✓ Done' : 'Pending']),
        headStyles: { fillColor: [76, 145, 117], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Reflection
    if (reflectionText || affirmation) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setTextColor(40, 30, 20);
      doc.text('Reflection', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(60, 50, 40);
      if (reflectionText) {
        const lines = doc.splitTextToSize(reflectionText, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 4;
      }
      if (affirmation) {
        doc.setFont('helvetica', 'italic');
        doc.text(`I am ${affirmation}.`, 14, y);
      }
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 140, 130);
      doc.text(`Velora • Generated ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`velora-${monthStr}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display text-foreground">{monthName} Overview</h2>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium mt-1">Monthly Dashboard</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Download size={16} /> Download Report
        </button>
      </div>

      {/* Monthly Reflection - moved to TOP */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">Monthly Reflection</p>
        <textarea
          value={reflectionText}
          onChange={e => setReflectionText(e.target.value)}
          placeholder="What went well this month? What would you improve?"
          className="w-full h-28 p-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">I am...</label>
          <input
            value={affirmation}
            onChange={e => setAffirmation(e.target.value)}
            placeholder="...grateful, disciplined, growing..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleSaveReflection}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Save Reflection
        </button>
      </div>

      {/* Even stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Completion" value={`${stats.percentage}%`} icon={<TrendingUp size={16} />} highlight={stats.percentage >= 80} />
        <StatsCard label="Best Streak" value={`${stats.longestStreak}d`} icon={<Flame size={16} />} />
        <StatsCard label="Perfect Days" value={String(perfectDays)} icon={<Award size={16} />} />
        <StatsCard label="Goals Done" value={`${monthlyCompleted}/${monthlyTotal}`} icon={<Target size={16} />} />
      </div>

      {/* LARGE Monthly Goals - full width */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-accent/5 via-card to-primary/5 border border-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">Monthly Goals</p>
            <h3 className="text-2xl md:text-3xl font-display text-foreground mt-1">Big-Picture Targets</h3>
          </div>
          <div className="text-right">
            <p className="text-4xl md:text-5xl font-bold text-foreground">{monthlyPct}<span className="text-xl text-muted-foreground">%</span></p>
            <p className="text-xs text-muted-foreground">{monthlyCompleted} of {monthlyTotal} done</p>
          </div>
        </div>

        {monthlyTotal > 0 && (
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${monthlyPct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-accent to-primary" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {monthlyHabits.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6 md:col-span-2">Add big-picture goals for this month</p>
          )}
          {monthlyHabits.map(h => (
            <div key={h.id} className={`flex items-center gap-3 group p-3 rounded-lg border transition-all ${h.completed ? 'bg-habit-complete/10 border-habit-complete/30' : 'bg-background border-border hover:border-primary/30'}`}>
              <button onClick={() => toggleMonthlyHabit(h.id)} className="flex-shrink-0">
                {h.completed ? <CheckCircle2 size={22} className="text-habit-complete" /> : <Circle size={22} className="text-muted-foreground/40" />}
              </button>
              <span className={`text-base flex-1 truncate ${h.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {h.name}
              </span>
              <button onClick={() => removeMonthlyHabit(h.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <input
            value={newMonthlyHabit}
            onChange={e => setNewMonthlyHabit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMonthlyHabit()}
            placeholder="Add a monthly goal..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={addMonthlyHabit} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {/* Main grid: top habits + radial + star */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Top habits */}
          <div className="p-5 rounded-xl bg-card border border-border h-full">
            <h3 className="text-lg font-display text-foreground mb-4 flex items-center gap-2"><Award size={18} /> Top Habits</h3>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No daily habits yet. Add some in the Daily view.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => `${val}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="completion" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {chartData.map((_, i) => <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Radial */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-accent/10 border border-border">
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium mb-2 text-center">Overall</p>
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: '32px', fontWeight: 'bold' }}>
                  {stats.percentage}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-muted-foreground">{stats.totalCompleted} of {stats.totalPossible} completed</p>
          </div>

          {starHabit && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary tracking-wider uppercase mb-1">⭐ Star Habit</p>
              <p className="font-medium text-foreground truncate">{starHabit.habit.name}</p>
              <p className="text-xs text-muted-foreground">{starHabit.percentage}% • {starHabit.longestStreak}d streak</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${highlight ? 'bg-habit-complete/10 border-habit-complete/30' : 'bg-card border-border'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={highlight ? 'text-habit-complete' : 'text-muted-foreground'}>{icon}</span>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-habit-complete' : 'text-foreground'}`}>{value}</p>
    </motion.div>
  );
}
