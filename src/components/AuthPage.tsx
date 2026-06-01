import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = mode === 'login'
      ? await login(email, password)
      : await signup(name, email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Something went wrong', description: error, variant: 'destructive' });
    } else {
      toast({ title: mode === 'login' ? 'Welcome back' : 'Account created', description: `Signed in as ${email}` });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-foreground mb-2">Velora</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Sign in to continue your journey.' : 'Create an account to start tracking.'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="pl-9" required />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required minLength={6} />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">At least 6 characters.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <p>Each account's habits are stored separately on this device. Your data stays private to your login.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
