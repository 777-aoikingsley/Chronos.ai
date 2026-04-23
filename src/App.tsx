/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Sparkles, 
  Wind, 
  BookOpen, 
  Wand2, 
  Share2, 
  ChevronLeft, 
  Camera, 
  CheckCircle2, 
  Circle, 
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Bell,
  BellOff,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { db, type ActivityLog, type ReminderSetting } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays, parseISO } from 'date-fns';
import { cn, ACTIVITIES } from './lib/utils';
// import confetti from 'canvas-confetti'; // Removed in favor of stars
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';

// --- Star Animation Utility ---

const StarBurst = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] [perspective:1200px] overflow-hidden">
      {[...Array(80)].map((_, i) => {
        const size = Math.random() * 3 + 1;
        const color = Math.random() > 0.4 ? '#FDFCF0' : '#FEF3C7';
        
        return (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: `${(Math.random() * 100)}vw`, 
              y: `${(Math.random() * 100)}vh`,
              z: -100
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1, 0],
              z: [ -100, 200, 400 ],
            }}
            transition={{ 
              duration: 1 + Math.random() * 1.5, 
              ease: "easeOut",
              delay: Math.random() * 0.1
            }}
            onAnimationComplete={i === 0 ? onComplete : undefined}
            className="absolute rounded-full"
            style={{ 
              width: size, 
              height: size, 
              backgroundColor: color,
              boxShadow: `0 0 ${size * 5}px 1px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};

// --- Shared Components ---

const NotificationManager = () => {
  useEffect(() => {
    if (!("Notification" in window)) return;

    const checkReminders = async () => {
      const now = format(new Date(), 'HH:mm');
      const settings = await db.reminderSettings.where({ time: now, enabled: 1 }).toArray();
      
      settings.forEach(setting => {
        const activity = ACTIVITIES.find(a => a.id === setting.id);
        if (activity) {
          new Notification(`${activity.name} Reminder`, {
            body: `It's time for your ${activity.name.toLowerCase()} session. Stay focused!`,
            icon: '/favicon.ico'
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
};

const ActivityGrid = ({ logs, type, selectedDate, onSelectDate }: { 
  logs: ActivityLog[] | undefined, 
  type: string,
  selectedDate: string,
  onSelectDate: (date: string) => void
}) => {
  const days = eachDayOfInterval({
    start: startOfMonth(parseISO(selectedDate)),
    end: endOfMonth(parseISO(selectedDate))
  });

  return (
    <div className="grid grid-cols-7 gap-2 p-4 bg-[#2C3E50]/20 rounded-xl border border-[#2C3E50]/50">
      {days.map((day) => {
        const dStr = format(day, 'yyyy-MM-dd');
        const log = logs?.find(l => l.date === dStr && l.type === type);
        const isCompleted = log?.completed;
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate === dStr;

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(dStr)}
            className={cn(
              "aspect-square rounded-sm transition-all duration-300 relative",
              isCompleted ? "bg-[#50C878] shadow-[0_0_10px_rgba(80,200,120,0.4)]" : "bg-[#2C3E50]/40",
              isSelected && "ring-2 ring-[#F5F5DC] ring-offset-2 ring-offset-[#121412] scale-110 z-10",
              !isSelected && isToday && !isCompleted && "border border-[#F5F5DC]/50"
            )}
            title={format(day, 'MMM d')}
          />
        );
      })}
    </div>
  );
};

const ReminderToggle = ({ activityId }: { activityId: string }) => {
  const settings = useLiveQuery(() => db.reminderSettings.get(activityId));
  const [time, setTime] = useState('09:00');

  useEffect(() => {
    if (settings) setTime(settings.time);
  }, [settings]);

  const handleToggle = async () => {
    const isEnabled = !settings?.enabled;
    if (isEnabled && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
    await db.reminderSettings.put({
      id: activityId,
      time: time,
      enabled: isEnabled
    });
  };

  const handleTimeChange = async (newTime: string) => {
    setTime(newTime);
    await db.reminderSettings.update(activityId, { time: newTime });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-[#2C3E50]/20 rounded-xl border border-[#2C3E50]/50 mb-6">
      <div className="flex items-center gap-3">
        <div onClick={handleToggle} className="cursor-pointer">
          {settings?.enabled ? <Bell className="text-[#50C878]" size={20} /> : <BellOff className="opacity-30" size={20} />}
        </div>
        <span className="text-sm opacity-70">Daily Reminder</span>
      </div>
      <input 
        type="time" 
        value={time} 
        onChange={(e) => handleTimeChange(e.target.value)}
        className="bg-transparent border-none text-[#F5F5DC] outline-none font-mono text-sm"
      />
    </div>
  );
};

const Timer = ({ activityId }: { activityId: string }) => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    let interval: number | undefined;
    if (isActive && seconds > 0) {
      interval = window.setInterval(() => {
        setSeconds(s => s - 1);
        setElapsed(e => e + 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      saveDuration();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const saveDuration = async () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const todayLog = await db.activityLogs.where({ date: dateStr, type: activityId }).first();
    const durationMins = Math.floor(elapsed / 60);
    
    if (durationMins > 0) {
      if (todayLog?.id) {
        await db.activityLogs.update(todayLog.id, { durationMinutes: (todayLog.durationMinutes || 0) + durationMins });
      } else {
        await db.activityLogs.add({
          date: dateStr,
          type: activityId,
          completed: false,
          durationMinutes: durationMins,
          checklistItems: []
        });
      }
      setElapsed(0);
    }
  };

  const toggle = () => {
    if (isActive) saveDuration();
    setIsActive(!isActive);
  };
  
  const reset = () => {
    setIsActive(false);
    setSeconds(25 * 60);
    setElapsed(0);
  };

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="flex flex-col items-center py-6 border-y border-[#2C3E50]/50">
      <div className="text-5xl font-mono tracking-tighter mb-4 text-[#F5F5DC]">
        {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
      </div>
      <div className="flex gap-4">
        <button onClick={toggle} className="p-2 bg-[#2C3E50] rounded-full hover:bg-[#3D5A73] transition-colors">
          {isActive ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={reset} className="p-2 bg-[#2C3E50] rounded-full hover:bg-[#3D5A73] transition-colors">
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};

// --- View Components ---

const TrendsView = ({ onBack }: { onBack: () => void }) => {
  const last30Days = useLiveQuery(() => 
    db.activityLogs.where('date').above(format(subDays(new Date(), 30), 'yyyy-MM-dd')).toArray()
  );

  const completionData = ACTIVITIES.map(activity => ({
    name: activity.name,
    count: last30Days?.filter(l => l.type === activity.id && l.completed).length || 0,
    color: '#50C878'
  }));

  const durationData = eachDayOfInterval({
    start: subDays(new Date(), 7),
    end: new Date()
  }).map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = last30Days?.filter(l => l.date === dayStr) || [];
    const totalMins = dayLogs.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    return {
      date: format(day, 'MMM d'),
      minutes: totalMins
    };
  });

  return (
    <div className="min-h-screen bg-[#121412] p-6 text-[#F5F5DC]">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="serif text-3xl font-medium tracking-tight uppercase">Trends</h1>
      </header>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] mb-6 opacity-50 flex items-center gap-2">
          <BarChart3 size={14} /> Completion Frequency (30d)
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C3E50" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C2E40', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                cursor={{ fill: '#2C3E50', opacity: 0.4 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {completionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#50C878' : '#2C3E50'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] mb-6 opacity-50 flex items-center gap-2">
          <Clock size={14} /> Focus Duration (Last 7 Days)
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={durationData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C3E50" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C2E40', border: 'none', borderRadius: '8px', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="#50C878" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#50C878', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#F5F5DC' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="p-6 bg-[#2C3E50]/20 rounded-2xl border border-[#2C3E50]/30 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-[#50C878]" size={20} />
          <h3 className="serif text-xl">Insight</h3>
        </div>
        <p className="text-sm opacity-60 leading-relaxed font-serif italic">
          Consistency is the silent architect of character. Your most active period was detected in the last few days. Maintain the ritual.
        </p>
      </section>

      <section className="p-6 bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="text-emerald-500" size={20} />
          <h3 className="serif text-xl font-medium">Privacy & Data</h3>
        </div>
        <p className="text-xs opacity-50 leading-relaxed mb-6 font-serif">
          Chronos uses <span className="text-emerald-400">Private Local Storage (IndexedDB)</span>. 
          Your photos, diaries, and logs are saved directly on your phone's memory. 
          Nothing is ever uploaded to a cloud server, ensuring your data stays private and the app remains free.
        </p>
        <button 
          onClick={async () => {
             if(confirm("Are you sure? This will permanently delete all your diary entries, activity logs, and photos from this device.")) {
               await db.activityLogs.clear();
               await db.reminderSettings.clear();
               window.location.reload();
             }
          }}
          className="w-full py-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-colors"
        >
          Clear All Local Data
        </button>
      </section>
    </div>
  );
};

const DetailView = ({ activity, onBack }: { activity: typeof ACTIVITIES[0], onBack: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showStars, setShowStars] = useState(false);
  const logs = useLiveQuery(() => db.activityLogs.where({ type: activity.id }).toArray());
  const selectedLog = logs?.find(l => l.date === selectedDate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    const currentItems = selectedLog?.checklistItems || [];
    const newItems = [...currentItems, { id: crypto.randomUUID(), text: newItemText.trim(), done: false }];
    
    if (selectedLog?.id) {
      await db.activityLogs.update(selectedLog.id, { checklistItems: newItems, completed: false });
    } else {
      await db.activityLogs.add({
        date: selectedDate,
        type: activity.id,
        completed: false,
        checklistItems: newItems
      });
    }
    setNewItemText('');
  };

  const handleToggleItem = async (index: number) => {
    if (!selectedLog) return;
    const newItems = [...selectedLog.checklistItems];
    newItems[index] = { ...newItems[index], done: !newItems[index].done };
    const isCompleted = newItems.every(i => i.done) && newItems.length > 0;
    
    await db.activityLogs.update(selectedLog.id!, { checklistItems: newItems, completed: isCompleted });

    if (isCompleted && !selectedLog.completed) {
      setShowStars(true);
    }
  };

  const handleRemoveItem = async (index: number) => {
    if (!selectedLog) return;
    const newItems = selectedLog.checklistItems.filter((_, i) => i !== index);
    const isCompleted = newItems.every(i => i.done) && newItems.length > 0;
    await db.activityLogs.update(selectedLog.id!, { checklistItems: newItems, completed: isCompleted });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (selectedLog?.id) {
        await db.activityLogs.update(selectedLog.id, { photoUrl: base64 });
      } else {
        await db.activityLogs.add({
          date: selectedDate,
          type: activity.id,
          completed: false,
          photoUrl: base64,
          checklistItems: []
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#121412] p-6 text-[#F5F5DC]">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="serif text-3xl font-medium tracking-tight uppercase">{activity.name}</h1>
      </header>

      {showStars && <StarBurst onComplete={() => setShowStars(false)} />}

      <ReminderToggle activityId={activity.id} />

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.2em] mb-4 opacity-50 flex justify-between">
          <span>30-Day Progress</span>
          <span className="text-[#50C878] italic">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</span>
        </h2>
        <ActivityGrid 
          logs={logs} 
          type={activity.id} 
          selectedDate={selectedDate} 
          onSelectDate={setSelectedDate} 
        />
      </section>

      <section 
        onClick={() => fileInputRef.current?.click()}
        className="mb-8 relative aspect-video border-2 border-dashed border-[#2C3E50] rounded-2xl flex flex-col items-center justify-center gap-2 group cursor-pointer overflow-hidden transition-all hover:bg-[#2C3E50]/10"
      >
        {selectedLog?.photoUrl ? (
          <img src={selectedLog.photoUrl} alt="Progress" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Camera size={40} className="opacity-30 group-hover:opacity-100 transition-opacity" />
            <div className="text-center">
              <p className="text-sm font-serif italic text-[#F5F5DC]/80">Tap to upload today's photo</p>
              <p className="text-[10px] uppercase tracking-widest opacity-30 mt-1">Gallery • Drive • Files • Camera</p>
            </div>
          </div>
        )}
        <input 
          key={selectedDate}
          type="file" 
          ref={fileInputRef} 
          onChange={handlePhotoUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </section>

      <section className="mb-8">
        <Timer activityId={activity.id} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">Custom Checklist</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="New item..."
              className="bg-[#2C3E50]/20 border border-[#2C3E50] rounded-lg px-2 py-1 text-xs outline-none focus:border-[#50C878]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button 
              onClick={handleAddItem}
              className="p-1 bg-[#50C878] text-[#121412] rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {selectedLog?.checklistItems.map((item, idx) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between group"
            >
              <div 
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => handleToggleItem(idx)}
              >
                {item.done ? 
                  <CheckCircle2 color="#50C878" size={24} /> : 
                  <Circle size={24} className="opacity-30 group-hover:opacity-50" />
                }
                <span className={cn("transition-all duration-300", item.done && "line-through opacity-40")}>
                  {item.text}
                </span>
              </div>
              <button 
                onClick={() => handleRemoveItem(idx)}
                className="opacity-0 group-hover:opacity-50 hover:text-red-400 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!selectedLog?.checklistItems || selectedLog.checklistItems.length === 0) && (
            <p className="text-xs opacity-20 italic text-center py-4">No tasks yet. Create one above.</p>
          )}
        </div>
      </section>
    </div>
  );
};

const DiaryView = ({ activity, onBack }: { activity: typeof ACTIVITIES[0], onBack: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showStars, setShowStars] = useState(false);
  const logs = useLiveQuery(() => db.activityLogs.where({ type: activity.id }).toArray());
  const selectedLog = logs?.find(l => l.date === selectedDate);
  
  const [diary, setDiary] = useState('');

  useEffect(() => {
    setDiary(selectedLog?.diaryEntry || '');
  }, [selectedLog]);

  const handleDiaryChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDiary(val);
    
    const isCompleted = val.trim().length > 10;
    
    if (selectedLog?.id) {
      const wasCompleted = selectedLog.completed;
      await db.activityLogs.update(selectedLog.id, { diaryEntry: val, completed: isCompleted });
      if (isCompleted && !wasCompleted) {
        setShowStars(true);
      }
    } else {
      await db.activityLogs.add({
        date: selectedDate,
        type: activity.id,
        completed: isCompleted,
        diaryEntry: val,
        checklistItems: []
      });
      if (isCompleted) {
        setShowStars(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#121412] p-6 text-[#F5F5DC]">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="serif text-3xl font-medium tracking-tight uppercase">{activity.name}</h1>
      </header>

      {showStars && <StarBurst onComplete={() => setShowStars(false)} />}

      <ReminderToggle activityId={activity.id} />

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.2em] mb-4 opacity-50 flex justify-between">
          <span>30-Day Activity History</span>
          <span className="text-[#50C878] italic">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</span>
        </h2>
        <ActivityGrid 
          logs={logs} 
          type={activity.id} 
          selectedDate={selectedDate} 
          onSelectDate={setSelectedDate} 
        />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] mb-4 opacity-50">Daily Diary</h2>
        <textarea
          value={diary}
          onChange={handleDiaryChange}
          placeholder="Reflect on today..."
          className="w-full h-64 bg-[#2C3E50]/10 p-4 border border-[#2C3E50]/30 rounded-xl outline-none resize-none font-serif text-lg leading-relaxed placeholder:opacity-20 focus:border-[#50C878]/50 transition-colors"
        />
      </section>
    </div>
  );
};

// --- Transition Component ---

const CircleReveal = ({ isVisible, toggleLocation, children, onExited }: { 
  isVisible: boolean, 
  toggleLocation: { x: number, y: number } | null,
  children: React.ReactNode,
  onExited: () => void
}) => {
  return (
    <AnimatePresence onExitComplete={onExited}>
      {isVisible && (
        <motion.div
          initial={{ clipPath: `circle(0% at ${toggleLocation?.x ?? 0}px ${toggleLocation?.y ?? 0}px)` }}
          animate={{ clipPath: `circle(150% at ${toggleLocation?.x ?? 0}px ${toggleLocation?.y ?? 0}px)` }}
          exit={{ clipPath: `circle(0% at ${toggleLocation?.x ?? 0}px ${toggleLocation?.y ?? 0}px)` }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-50 overflow-y-auto bg-[#121412]"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [selectedActivity, setSelectedActivity] = useState<typeof ACTIVITIES[0] | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [toggleLocation, setToggleLocation] = useState<{ x: number, y: number } | null>(null);
  
  const handleItemTap = (e: React.MouseEvent, activity: typeof ACTIVITIES[0]) => {
    setToggleLocation({ x: e.clientX, y: e.clientY });
    setSelectedActivity(activity);
  };

  const handleTrendsTap = (e: React.MouseEvent) => {
    setToggleLocation({ x: e.clientX, y: e.clientY });
    setShowTrends(true);
  };

  const IconMap: Record<string, any> = {
    Dumbbell, Sparkles, Wind, BookOpen, Wand2, Share2
  };

  return (
    <div className="min-h-screen bg-[#121412] max-w-md mx-auto relative select-none">
      <NotificationManager />
      
      <main className="p-8">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="serif text-4xl font-medium mb-1 tracking-tight">Chronos</h1>
            <p className="text-xs uppercase tracking-[0.3em] opacity-30">Aesthetic Endurance</p>
          </div>
          <button 
            onClick={handleTrendsTap}
            className="p-3 bg-[#2C3E50]/20 rounded-xl hover:bg-[#2C3E50]/30 transition-all text-[#F5F5DC]/60 hover:text-[#50C878]"
          >
            <BarChart3 size={20} />
          </button>
        </header>

        <div className="space-y-4">
          <AnimatePresence>
            {ACTIVITIES.map((item, idx) => {
              const Icon = IconMap[item.icon];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: idx * 0.05,
                    type: "spring",
                    stiffness: 100 
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => handleItemTap(e, item)}
                  className="flex items-center justify-between p-6 bg-[#2C3E50]/20 rounded-2xl border border-[#2C3E50]/30 hover:bg-[#2C3E50]/30 active:scale-95 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#2C3E50]/40 rounded-xl group-hover:text-[#50C878] transition-colors">
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className="serif text-xl font-medium tracking-wide">{item.name}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2C3E50] group-hover:bg-[#50C878] transition-colors" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        <footer className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 opacity-20 mb-1">
            <Smartphone size={10} />
            <span className="text-[10px] uppercase tracking-[0.2em]">Private Local Database</span>
          </div>
          <p className="text-[9px] opacity-10 uppercase tracking-[0.1em]">No Cloud • Your Phone • Your Power</p>
        </footer>
      </main>

      <CircleReveal 
        isVisible={!!selectedActivity || showTrends} 
        toggleLocation={toggleLocation}
        onExited={() => setToggleLocation(null)}
      >
        {showTrends ? (
          <TrendsView onBack={() => setShowTrends(false)} />
        ) : selectedActivity?.type === 'detail' ? (
          <DetailView activity={selectedActivity} onBack={() => setSelectedActivity(null)} />
        ) : selectedActivity && (
          <DiaryView activity={selectedActivity} onBack={() => setSelectedActivity(null)} />
        )}
      </CircleReveal>

      {/* Background decoration */}
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] aspect-square bg-[#50C878]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] aspect-square bg-[#2C3E50]/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
