import { useState, useEffect } from 'react';
import { HabitProvider } from '@/context/HabitContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import DailyView from '@/components/DailyView';
import WeeklyView from '@/components/WeeklyView';
import MonthlyView from '@/components/MonthlyView';
import YearlyView from '@/components/YearlyView';
import MonthSelector from '@/components/MonthSelector';
import AuthPage from '@/components/AuthPage';
import ProfilePanel from '@/components/ProfilePanel';
import { CalendarDays, CalendarRange, BarChart3, TrendingUp, Sun, Moon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ViewMode } from '@/types/habit';

const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'daily', label: 'Daily', icon: <CalendarDays size={16} /> },
  { id: 'weekly', label: 'Weekly', icon: <CalendarRange size={16} /> },
  { id: 'monthly', label: 'Monthly', icon: <BarChart3 size={16} /> },
  { id: 'yearly', label: 'Yearly', icon: <TrendingUp size={16} /> },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button onClick={() => setDark(!dark)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function HabitApp() {
  const [view, setView] = useState<ViewMode>('daily');
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setProfileOpen(true)}
            className="text-left rounded-lg px-2 -mx-2 py-1 hover:bg-muted/60 transition-colors"
            title="View profile"
          >
            <h1 className="text-2xl font-display text-foreground">Velora</h1>
            <p className="text-xs text-muted-foreground">
              {user ? `Hello, ${user.name}` : 'Track habits. Build momentum.'}
            </p>
          </button>
          <div className="flex items-center gap-2">
            <MonthSelector />
            <ThemeToggle />
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />


      {/* Tab navigation */}
      <nav className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  view === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.icon}
                {tab.label}
                {view === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-muted -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'daily' && <DailyView />}
            {view === 'weekly' && <WeeklyView />}
            {view === 'monthly' && <MonthlyView />}
            {view === 'yearly' && <YearlyView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <AuthPage />;
  return (
    <HabitProvider>
      <HabitApp />
    </HabitProvider>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
