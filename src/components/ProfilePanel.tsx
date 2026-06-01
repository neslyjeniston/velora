import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LogOut, User, Mail, Activity, CheckCircle2, Flame, Calendar,
  Pencil, Check, Lock, Download, Palette, Eye, EyeOff,
  Trash2, AlertTriangle, Target, TrendingUp, Quote,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useHabits } from '@/context/HabitContext';
import { toast } from '@/hooks/use-toast';

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  { name: 'Ink', bg: 'hsl(var(--foreground))', fg: 'hsl(var(--background))' },
  { name: 'Rose', bg: '#c2596b', fg: '#fff' },
  { name: 'Sage', bg: '#7d9b76', fg: '#fff' },
  { name: 'Ochre', bg: '#c9a84c', fg: '#1a1a1a' },
  { name: 'Indigo', bg: '#4f46e5', fg: '#fff' },
  { name: 'Clay', bg: '#a0522d', fg: '#fff' },
];

const AVATAR_KEY = 'velora-profile-avatar';
const BIO_KEY = 'velora-profile-bio';

type Tab = 'overview' | 'settings' | 'danger';

export default function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { user, logout, updateName, changePassword, deleteAccount, getCreatedAt } = useAuth();
  const { habits, completions, reflections, clearAllData } = useHabits();

  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [bio, setBio] = useState('');
  const [bioDirty, setBioDirty] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const stored = parseInt(localStorage.getItem(`${AVATAR_KEY}::${user.id}`) || '0', 10);
    setAvatarIdx(isNaN(stored) ? 0 : stored);
    setBio(localStorage.getItem(`${BIO_KEY}::${user.id}`) || '');
    setBioDirty(false);
  }, [user, open]);

  useEffect(() => {
    if (open) {
      setTab('overview');
      setEditing(false);
      setCurrentPw('');
      setNewPw('');
      setShowPw(false);
      setConfirmReset(false);
      setConfirmDelete(false);
      setDeletePw('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const streak = useMemo(() => {
    if (!completions.length) return 0;
    const dates = new Set(completions.map(c => c.date));
    let s = 0;
    const d = new Date();
    while (dates.has(d.toISOString().slice(0, 10))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [completions]);

  const bestStreak = useMemo(() => {
    if (!completions.length) return 0;
    const dates = Array.from(new Set(completions.map(c => c.date))).sort();
    let best = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    return best;
  }, [completions]);

  const createdAt = useMemo(() => getCreatedAt(), [getCreatedAt, open]);
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';
  const daysActive = createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) + 1)
    : 1;

  const completionRate = useMemo(() => {
    if (!habits.length) return 0;
    const possible = habits.length * daysActive;
    if (!possible) return 0;
    return Math.min(100, Math.round((completions.length / possible) * 100));
  }, [habits.length, completions.length, daysActive]);

  if (!user) return null;
  const avatar = AVATAR_COLORS[avatarIdx] ?? AVATAR_COLORS[0];
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const saveAvatar = (idx: number) => {
    setAvatarIdx(idx);
    localStorage.setItem(`${AVATAR_KEY}::${user.id}`, String(idx));
  };

  const saveName = () => {
    const res = updateName(nameDraft);
    if (res.error) {
      toast({ title: 'Could not update name', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Name updated' });
    setEditing(false);
  };

  const saveBio = () => {
    localStorage.setItem(`${BIO_KEY}::${user.id}`, bio);
    setBioDirty(false);
    toast({ title: 'Bio saved' });
  };

  const submitPassword = async () => {
    setPwBusy(true);
    const res = await changePassword(currentPw, newPw);
    setPwBusy(false);
    if (res.error) {
      toast({ title: 'Password change failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Password updated' });
    setCurrentPw('');
    setNewPw('');
  };

  const exportData = () => {
    const account = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: createdAt ?? null,
      memberSince: memberSince !== '—' ? memberSince : null,
      daysActive,
    };
    const profile = {
      avatar: AVATAR_COLORS[avatarIdx],
      bio: bio || null,
    };
    const stats = {
      totalHabits: habits.length,
      totalCompletions: completions.length,
      currentStreak: streak,
      bestStreak,
      completionRate,
      daysActive,
    };
    const rawStorage: Record<string, unknown> = {};
    const suffix = `::${user.id}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith(suffix)) {
        try {
          const val = localStorage.getItem(key);
          rawStorage[key] = val ? JSON.parse(val) : val;
        } catch {
          rawStorage[key] = localStorage.getItem(key);
        }
      }
    }

    const payload = {
      veloraVersion: '1.0',
      exportedAt: new Date().toISOString(),
      account,
      profile,
      stats,
      data: { habits, completions, reflections },
      rawStorage,
    };

    // Generate PDF
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeHeading = (text: string, size = 18) => {
        ensureSpace(size + 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(30, 30, 30);
        doc.text(text, margin, y);
        y += size + 8;
      };

      const writeSubheading = (text: string) => {
        ensureSpace(22);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(70, 70, 70);
        doc.text(text, margin, y);
        y += 18;
      };

      const writeLine = (label: string, value: string) => {
        ensureSpace(16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        const labelW = doc.getTextWidth(`${label}:`) + 6;
        const wrapped = doc.splitTextToSize(value, pageW - margin * 2 - labelW);
        doc.text(wrapped, margin + labelW, y);
        y += 14 * wrapped.length;
      };

      const writeParagraph = (text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const wrapped = doc.splitTextToSize(text, pageW - margin * 2);
        wrapped.forEach((ln: string) => {
          ensureSpace(14);
          doc.text(ln, margin, y);
          y += 13;
        });
      };

      const divider = () => {
        ensureSpace(16);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y);
        y += 14;
      };

      // Title
      writeHeading('Velora — Account Export', 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text(`Exported ${new Date(payload.exportedAt).toLocaleString()}`, margin, y);
      y += 18;
      divider();

      // Account
      writeSubheading('Account');
      writeLine('Name', account.name);
      writeLine('Email', account.email);
      writeLine('User ID', account.id);
      writeLine('Member since', account.memberSince ?? '—');
      writeLine('Days active', String(account.daysActive));
      divider();

      // Profile
      writeSubheading('Profile');
      writeLine('Avatar color', typeof profile.avatar === 'string' ? profile.avatar : (profile.avatar?.name ?? '—'));
      writeLine('Bio', profile.bio || '—');
      divider();

      // Stats
      writeSubheading('Statistics');
      writeLine('Total habits', String(stats.totalHabits));
      writeLine('Total completions', String(stats.totalCompletions));
      writeLine('Current streak', `${stats.currentStreak} days`);
      writeLine('Best streak', `${stats.bestStreak} days`);
      writeLine('Completion rate', `${stats.completionRate}%`);
      divider();

      // Habits
      writeSubheading(`Habits (${habits.length})`);
      if (habits.length === 0) writeParagraph('No habits yet.');
      habits.forEach((h: any, i: number) => {
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`${i + 1}. ${h.name ?? h.title ?? 'Untitled'}`, margin, y);
        y += 14;
        const meta = [
          h.type && `type: ${h.type}`,
          h.category && `category: ${h.category}`,
          h.frequency && `frequency: ${h.frequency}`,
        ].filter(Boolean).join(' • ');
        if (meta) writeParagraph(meta);
      });
      divider();

      // Reflections
      writeSubheading(`Reflections (${reflections.length})`);
      if (reflections.length === 0) writeParagraph('No reflections yet.');
      reflections.slice(0, 50).forEach((r: any) => {
        const date = r.date || r.createdAt || '';
        writeLine(String(date), String(r.text ?? r.content ?? ''));
      });
      divider();

      // Completions log (text)
      writeSubheading(`Completions Log (${completions.length})`);
      if (completions.length === 0) {
        writeParagraph('No completions recorded.');
      } else {
        const byHabit = new Map<string, string[]>();
        completions.forEach((c: any) => {
          if (!c?.completed) return;
          const list = byHabit.get(c.habitId) ?? [];
          list.push(c.date);
          byHabit.set(c.habitId, list);
        });
        habits.forEach((h: any) => {
          const dates = (byHabit.get(h.id) ?? []).sort();
          ensureSpace(18);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(`${h.name ?? 'Untitled'} — ${dates.length} completion${dates.length === 1 ? '' : 's'}`, margin, y);
          y += 13;
          if (dates.length) writeParagraph(dates.join(', '));
        });
      }
      divider();

      // Additional stored data (text)
      const extraKeys = Object.keys(payload.rawStorage).filter(
        k => !k.startsWith('habit-tracker-')
      );
      if (extraKeys.length) {
        writeSubheading('Additional Stored Data');
        extraKeys.forEach(k => {
          const cleanKey = k.replace(`::${user.id}`, '');
          const val = payload.rawStorage[k];
          let text: string;
          if (val === null || val === undefined) text = '—';
          else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') text = String(val);
          else if (Array.isArray(val)) text = val.length ? val.map(v => typeof v === 'object' ? Object.entries(v).map(([k2, v2]) => `${k2}: ${v2}`).join(', ') : String(v)).join(' | ') : '—';
          else text = Object.entries(val).map(([k2, v2]) => `${k2}: ${typeof v2 === 'object' ? JSON.stringify(v2) : v2}`).join(' • ');
          writeLine(cleanKey, text);
        });
      }

      // Footer page numbers
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(`Velora • Page ${p} of ${pages}`, pageW - margin, pageH - 20, { align: 'right' });
      }

      doc.save(`velora-${user.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
      toast({ title: 'Account data exported', description: 'Your account snapshot PDF has been downloaded.' });
    });
  };

  const handleReset = () => {
    clearAllData();
    setConfirmReset(false);
    toast({ title: 'All habit data cleared' });
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    const res = await deleteAccount(deletePw);
    setDeleteBusy(false);
    if (res.error) {
      toast({ title: 'Could not delete account', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Account deleted' });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="profile-root"
          initial={{ opacity: 0, pointerEvents: 'none' as const }}
          animate={{ opacity: 1, pointerEvents: 'auto' as const }}
          exit={{ opacity: 0, pointerEvents: 'none' as const, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-[60]"
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }}
            className="absolute z-[70] w-[min(420px,90vw)] max-h-[80vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl origin-top-left"
            style={{ top: '72px', left: 'max(16px, calc(50% - 36rem + 16px))' }}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-border bg-gradient-to-br from-muted/40 to-transparent">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-4">
                <motion.div
                  key={avatarIdx}
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl shrink-0"
                  style={{ background: avatar.bg, color: avatar.fg }}
                >
                  {initials || <User size={28} />}
                </motion.div>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveName()}
                        className="flex-1 min-w-0 bg-background border border-border rounded-md px-2 py-1 text-base font-display focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      <button onClick={saveName} className="p-1.5 rounded-md hover:bg-muted text-foreground" title="Save">
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-display text-foreground truncate">{user.name}</h2>
                      <button
                        onClick={() => { setNameDraft(user.name); setEditing(true); }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Edit name"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} /> {user.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar size={11} /> Member since {memberSince}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-3 pt-3 gap-1">
              {(['overview', 'settings', 'danger'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-4 py-2 text-sm capitalize transition-colors ${
                    tab === t
                      ? t === 'danger' ? 'text-destructive' : 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                  {tab === t && (
                    <motion.div
                      layoutId="profileTab"
                      className={`absolute bottom-0 left-0 right-0 h-0.5 ${t === 'danger' ? 'bg-destructive' : 'bg-foreground'}`}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              <AnimatePresence mode="wait">
                {tab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {bio && (
                      <div className="rounded-xl border border-border p-3 text-sm text-foreground italic flex gap-2">
                        <Quote size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <span className="leading-snug">{bio}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard icon={<Activity size={14} />} label="Habits" value={habits.length} />
                      <StatCard icon={<CheckCircle2 size={14} />} label="Completions" value={completions.length} />
                      <StatCard icon={<Flame size={14} />} label="Current streak" value={`${streak}d`} accent={streak > 0} />
                      <StatCard icon={<Target size={14} />} label="Best streak" value={`${bestStreak}d`} />
                      <StatCard icon={<TrendingUp size={14} />} label="Completion" value={`${completionRate}%`} />
                      <StatCard icon={<Calendar size={14} />} label="Days active" value={daysActive} />
                    </div>
                    <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                      Your data is stored privately in your browser, isolated per account.
                    </div>
                  </motion.div>
                )}

                {tab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Bio */}
                    <section>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Quote size={12} /> Bio / status
                      </h3>
                      <textarea
                        value={bio}
                        onChange={e => { setBio(e.target.value); setBioDirty(true); }}
                        placeholder="A short note about you or your current focus…"
                        maxLength={160}
                        rows={2}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-muted-foreground">{bio.length}/160</span>
                        <button
                          onClick={saveBio}
                          disabled={!bioDirty}
                          className="text-xs px-3 py-1 rounded-md bg-foreground text-background disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </section>

                    {/* Avatar color */}
                    <section>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Palette size={12} /> Avatar color
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        {AVATAR_COLORS.map((c, i) => (
                          <button
                            key={c.name}
                            onClick={() => saveAvatar(i)}
                            title={c.name}
                            className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${
                              avatarIdx === i ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''
                            }`}
                            style={{ background: c.bg }}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Change password */}
                    <section>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Lock size={12} /> Change password
                      </h3>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="Current password"
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            className="w-full bg-background border border-border rounded-md px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(s => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                          >
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <input
                          type={showPw ? 'text' : 'password'}
                          placeholder="New password (min 6)"
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        />
                        <button
                          onClick={submitPassword}
                          disabled={!currentPw || !newPw || pwBusy}
                          className="w-full px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                          {pwBusy ? 'Updating…' : 'Update password'}
                        </button>
                      </div>
                    </section>

                    {/* Data */}
                    <section>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Data</h3>
                      <button
                        onClick={exportData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-foreground text-sm font-medium transition-colors"
                      >
                        <Download size={16} /> Export my data (JSON)
                      </button>
                    </section>
                  </motion.div>
                )}

                {tab === 'danger' && (
                  <motion.div
                    key="danger"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>These actions are permanent and cannot be undone.</span>
                    </div>

                    {/* Reset habit data */}
                    <section>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Reset habit data</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Erases all habits, completions and reflections. Your account stays.
                      </p>
                      {!confirmReset ? (
                        <button
                          onClick={() => setConfirmReset(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted text-foreground text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} /> Clear all habit data
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleReset}
                            className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90"
                          >
                            Confirm reset
                          </button>
                          <button
                            onClick={() => setConfirmReset(false)}
                            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </section>

                    {/* Delete account */}
                    <section>
                      <h3 className="text-xs font-medium text-destructive uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Delete account
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Permanently removes your account and every trace of your data from this browser.
                      </p>
                      {!confirmDelete ? (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} /> Delete my account
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="Enter password to confirm"
                            value={deletePw}
                            onChange={e => setDeletePw(e.target.value)}
                            className="w-full bg-background border border-destructive/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleDelete}
                              disabled={!deletePw || deleteBusy}
                              className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90"
                            >
                              {deleteBusy ? 'Deleting…' : 'Permanently delete'}
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(false); setDeletePw(''); }}
                              className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>


              <button
                onClick={() => { onClose(); logout(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-foreground text-sm font-medium transition-colors"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-xl border p-4 transition-colors ${
        accent ? 'border-foreground/30 bg-muted/40' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-display text-foreground">{value}</div>
    </motion.div>
  );
}
