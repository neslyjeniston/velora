import { useHabits } from '@/context/HabitContext';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, Award, Calendar, Target, Flame, Sparkles, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function YearlyView() {
  const { getYearlyStats, selectedDate, habits } = useHabits();
  const year = selectedDate.getFullYear();
  const yearlyData = getYearlyStats(year);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = yearlyData.map((d, i) => ({
    month: monthNames[i],
    completed: d.stats.totalCompleted,
    total: d.stats.totalPossible,
    percentage: d.stats.percentage,
    streak: d.stats.longestStreak,
  }));

  const totalCompleted = yearlyData.reduce((s, d) => s + d.stats.totalCompleted, 0);
  const totalPossible = yearlyData.reduce((s, d) => s + d.stats.totalPossible, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const yearStreak = yearlyData.reduce((m, d) => Math.max(m, d.stats.longestStreak), 0);

  const activeMonths = chartData.filter(m => m.total > 0);
  const fallback = { month: '—', completed: 0, total: 0, percentage: 0, streak: 0 };
  const bestMonth = activeMonths.reduce((best, m) => (m.percentage > best.percentage ? m : best), activeMonths[0] || fallback);
  const worstMonth = activeMonths.reduce((worst, m) => (m.percentage < worst.percentage ? m : worst), activeMonths[0] || fallback);
  const avgPct = activeMonths.length > 0 ? Math.round(activeMonths.reduce((s, m) => s + m.percentage, 0) / activeMonths.length) : 0;

  const radialData = [{ name: 'Year', value: overallPct, fill: 'hsl(var(--primary))' }];
  const totalHabits = habits.length;

  // Quarterly breakdown
  const quarters = [
    { q: 'Q1', months: chartData.slice(0, 3) },
    { q: 'Q2', months: chartData.slice(3, 6) },
    { q: 'Q3', months: chartData.slice(6, 9) },
    { q: 'Q4', months: chartData.slice(9, 12) },
  ].map(q => {
    const c = q.months.reduce((s, m) => s + m.completed, 0);
    const t = q.months.reduce((s, m) => s + m.total, 0);
    return { quarter: q.q, completed: c, total: t, pct: t > 0 ? Math.round((c / t) * 100) : 0 };
  });

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(245, 230, 211);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(22);
    doc.setTextColor(40, 30, 20);
    doc.text('Velora — Annual Report', 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(100, 90, 80);
    doc.text(`${year} Year in Review`, 14, 27);

    let y = 48;

    doc.setFontSize(14);
    doc.setTextColor(40, 30, 20);
    doc.text('Year Summary', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 50, 40);
    const summary = [
      `Overall completion: ${overallPct}% (${totalCompleted}/${totalPossible})`,
      `Best streak of the year: ${yearStreak} days`,
      `Active months: ${activeMonths.length} of 12`,
      `Habits tracked: ${totalHabits}`,
      `Average monthly rate: ${avgPct}%`,
      `Best month: ${bestMonth?.month} (${bestMonth?.percentage}%)`,
      `Needs focus: ${worstMonth?.month} (${worstMonth?.percentage}%)`,
    ];
    summary.forEach(s => { doc.text(s, 14, y); y += 6; });
    y += 4;

    // Monthly breakdown
    autoTable(doc, {
      startY: y,
      head: [['Month', 'Completed', 'Possible', '%', 'Best Streak']],
      body: chartData.map(m => [m.month, String(m.completed), String(m.total), `${m.percentage}%`, `${m.streak}d`]),
      headStyles: { fillColor: [204, 102, 51], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Quarterly breakdown
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(40, 30, 20);
    doc.text('Quarterly Breakdown', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Quarter', 'Completed', 'Possible', '%']],
      body: quarters.map(q => [q.quarter, String(q.completed), String(q.total), `${q.pct}%`]),
      headStyles: { fillColor: [76, 145, 117], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 140, 130);
      doc.text(`Velora • Generated ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`velora-${year}-annual.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-border p-6 md:p-8">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={140} /></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Annual Review</p>
            <h2 className="text-3xl md:text-4xl font-display text-foreground mt-2">{year} Year in Review</h2>
            <p className="text-sm text-muted-foreground mt-3">
              {activeMonths.length} active months • {totalHabits} habits tracked
            </p>
            <button
              onClick={handleDownloadPDF}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={16} /> Download Annual Report
            </button>
          </div>
          <div className="flex items-center justify-center md:justify-end">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="65%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    {overallPct}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <YearCard label="Completed" value={String(totalCompleted)} sub={`of ${totalPossible}`} icon={<Target size={16} />} />
        <YearCard label="Best Month" value={bestMonth?.month || '—'} sub={`${bestMonth?.percentage || 0}%`} icon={<Award size={16} />} highlight />
        <YearCard label="Avg Monthly" value={`${avgPct}%`} icon={<TrendingUp size={16} />} />
        <YearCard label="Best Streak" value={`${yearStreak}d`} icon={<Flame size={16} />} />
      </div>

      {/* Quarterly breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quarters.map((q, i) => (
          <motion.div
            key={q.quarter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{q.quarter}</p>
              <span className="text-[10px] text-muted-foreground">{q.completed}/{q.total}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{q.pct}%</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${q.pct}%` }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-card border border-border">
          <h3 className="text-base font-display text-foreground mb-4 flex items-center gap-2"><Calendar size={16} /> Monthly Completions</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="total" fill="hsl(var(--muted))" radius={[6, 6, 0, 0]} maxBarSize={28} name="Total" />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={28} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <h3 className="text-base font-display text-foreground mb-4 flex items-center gap-2"><TrendingUp size={16} /> Consistency Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="yearGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `${val}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="percentage" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#yearGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border lg:col-span-2">
          <h3 className="text-base font-display text-foreground mb-4 flex items-center gap-2"><Flame size={16} /> Streak Throughout the Year</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(val: number) => `${val} days`} />
              <Line type="monotone" dataKey="streak" stroke="hsl(var(--habit-streak))" strokeWidth={3} dot={{ fill: 'hsl(var(--habit-streak))', r: 5 }} name="Best streak" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary tracking-wider uppercase mb-2">🏆 Best Month</p>
          <p className="text-2xl font-display text-foreground">{bestMonth?.month}</p>
          <p className="text-sm text-muted-foreground">{bestMonth?.percentage}% completion • {bestMonth?.completed} habits done</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-2">📊 Needs Focus</p>
          <p className="text-2xl font-display text-foreground">{worstMonth?.month}</p>
          <p className="text-sm text-muted-foreground">{worstMonth?.percentage}% — room to grow</p>
        </div>
      </div>
    </div>
  );
}

function YearCard({ label, value, sub, icon, highlight }: { label: string; value: string; sub?: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={highlight ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>}
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}
        {sub && <span className="text-sm font-normal text-muted-foreground ml-1">{sub}</span>}
      </p>
    </motion.div>
  );
}
