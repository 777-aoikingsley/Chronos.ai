import Dexie, { type Table } from 'dexie';

export interface ActivityLog {
  id?: number;
  date: string; // YYYY-MM-DD
  type: string; // Workout, Haircare, etc.
  completed: boolean;
  photoUrl?: string;
  diaryEntry?: string;
  durationMinutes?: number;
  checklistItems: { id: string; text: string; done: boolean }[];
}

export interface ReminderSetting {
  id: string; // Matches activity id
  time: string; // HH:mm
  enabled: boolean;
}

export class ChronosDatabase extends Dexie {
  activityLogs!: Table<ActivityLog>;
  reminderSettings!: Table<ReminderSetting>;

  constructor() {
    super('ChronosDB');
    this.version(3).stores({
      activityLogs: '++id, [date+type], date, type, completed',
      reminderSettings: 'id, [time+enabled]'
    });
  }
}

export const db = new ChronosDatabase();
