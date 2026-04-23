import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ACTIVITIES = [
  { id: 'workout', name: 'Workout', icon: 'Dumbbell', type: 'detail' },
  { id: 'haircare', name: 'Haircare', icon: 'Sparkles', type: 'detail' },
  { id: 'skincare', name: 'Skincare', icon: 'Wind', type: 'detail' },
  { id: 'study', name: 'Study', icon: 'BookOpen', type: 'detail' },
  { id: 'skill', name: 'Skillbuilding', icon: 'Wand2', type: 'diary' },
  { id: 'posting', name: 'Posting', icon: 'Share2', type: 'diary' },
];

export const THEME = {
  bg: 'bg-[#121412]',
  card: 'bg-[#2C3E50]',
  text: 'text-[#F5F5DC]',
  accent: 'text-[#50C878]', // Emerald Green
  slate: 'text-[#94A3B8]',
  separator: 'border-[#2C3E50]',
};
