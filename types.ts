
export enum TaskStatus {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  DELAYED = "Delayed"
}

export type TaskType = 'wedding' | 'lina' | 'serag';

export enum TaskCategory {
  VENUE = "Venue",
  CATERING = "Catering",
  ATTIRE = "Attire",
  PHOTOGRAPHY = "Photography",
  MUSIC = "Music",
  DECOR = "Decor",
  FLOWERS = "Flowers",
  STATIONERY = "Stationery",
  BEAUTY = "Beauty",
  TRANSPORTATION = "Transportation",
  INVITATIONS = "Invitations",
  GUEST_LIST = "Guest List",
  LEGAL = "Legal",
  HONEYMOON = "Honeymoon",
  OTHER = "Other",
  DAILY = "Daily Task"
}

export interface Task {
  id: string;
  name: string;
  category: TaskCategory | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TaskStatus;
  initialCost: number;
  actualCost: number;
  dependencies: string[]; // Array of Task IDs
  notes: string;
  important: boolean;
  type?: TaskType; // 'wedding' (default), 'lina', or 'serag'
}

export interface FilterState {
  search: string;
  category: string;
  status: string[]; // Changed to array for multi-select
  dateRange: {
    start: string;
    end: string;
  };
}

export type ViewMode = 'dashboard' | 'list' | 'gantt' | 'timeline' | 'todo';
