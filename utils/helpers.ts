
import { Task, TaskCategory, TaskStatus } from "../types";
import { CATEGORY_COLORS } from "../constants";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const calculateDaysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
};

export const isTaskDelayed = (task: Task): boolean => {
  if (task.status === TaskStatus.DELAYED) return true;
  if (task.status === TaskStatus.COMPLETED) return false;
  if (!task.startDate || !task.endDate) return false; // Cannot be delayed if no date set

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  // Status != Completed AND Due Date in past
  if (end < today) return true;

  // Start Date in past AND (Status == Not Started)
  if (task.status === TaskStatus.NOT_STARTED && start < today) return true;

  return false;
};

export const isTaskDueSoon = (task: Task): boolean => {
  if (task.status === TaskStatus.COMPLETED) return false;
  if (!task.endDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const end = new Date(task.endDate);
  
  if (isNaN(end.getTime())) return false;
  return end >= today && end <= nextWeek;
};

export const isTaskActiveToday = (task: Task): boolean => {
  if (!task.startDate || !task.endDate) return false;

  const today = new Date();
  // today.setHours(0, 0, 0, 0);
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return today >= start && today <= end;
};

// Color Helper for Dynamic Categories
export const getCategoryColor = (category: string): string => {
  // 1. Check if it's a standard category
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  // 2. Generate a consistent pastel color for unknown categories
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 80%)`; // Pastel HSL
};

// CSV Helpers
export const tasksToCSV = (tasks: Task[]): string => {
  const headers = [
    "ID", "Task Name", "Category", "Start Date", "End Date", 
    "Status", "Initial Cost", "Actual Cost", "Dependencies", "Notes", "Important"
  ];
  
  const rows = tasks.map(t => [
    t.id,
    `"${t.name.replace(/"/g, '""')}"`,
    t.category,
    t.startDate,
    t.endDate,
    t.status,
    t.initialCost,
    t.actualCost,
    `"${t.dependencies.join(',')}"`,
    `"${t.notes.replace(/"/g, '""')}"`,
    t.important ? "Yes" : "No"
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const parseCSVToTasks = (csvContent: string): Task[] => {
  const lines = csvContent.split(/\r?\n/); 
  const tasks: Task[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuote = false;
    
    for(let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        if (inQuote && line[charIndex + 1] === '"') {
          current += '"';
          charIndex++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    if (values.length < 5) continue; 

    // Intelligent Category Matching (Allow dynamic strings)
    // We try to match enum for casing consistency, but fallback to raw string
    const rawCat = (values[2] || '').trim();
    const matchedCat = Object.values(TaskCategory).find(
      enumVal => enumVal.toLowerCase() === rawCat.toLowerCase()
    );
    // Use matched enum if found (for consistent casing), otherwise capitalize the raw input
    const finalCat = matchedCat || (rawCat.charAt(0).toUpperCase() + rawCat.slice(1)) || 'Other';

    // Intelligent Status Matching
    const rawStatus = (values[5] || '').trim();
    const matchedStatus = Object.values(TaskStatus).find(
      enumVal => enumVal.toLowerCase() === rawStatus.toLowerCase()
    );
    const finalStat = matchedStatus || TaskStatus.NOT_STARTED;

    const depsRaw = values[8] || '';
    const dependencies = depsRaw.split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const importantRaw = (values[10] || '').trim().toLowerCase();
    const isImportant = importantRaw === 'yes' || importantRaw === 'true';

    tasks.push({
      id: (values[0] || '').trim() || crypto.randomUUID(), 
      name: (values[1] || 'Untitled Task').trim(),
      category: finalCat,
      startDate: (values[3] || '').trim(), // Allow empty
      endDate: (values[4] || '').trim(),   // Allow empty
      status: finalStat,
      initialCost: parseFloat(values[6]) || 0,
      actualCost: parseFloat(values[7]) || 0,
      dependencies: dependencies,
      notes: (values[9] || '').trim(),
      important: isImportant
    });
  }
  return tasks;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
