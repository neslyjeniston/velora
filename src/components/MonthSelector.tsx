import { useHabits } from '@/context/HabitContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MonthSelector() {
  const { selectedDate, setSelectedDate } = useHabits();

  const prev = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const next = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const today = () => setSelectedDate(new Date());

  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ChevronLeft size={18} />
      </button>
      <motion.span
        key={selectedDate.toISOString().slice(0, 7)}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-foreground min-w-[140px] text-center"
      >
        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </motion.span>
      <button onClick={next} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <ChevronRight size={18} />
      </button>
      <button onClick={today} className="text-xs px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors">
        Today
      </button>
    </div>
  );
}
