import { Task, TaskCategory, TaskStatus } from "../types";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const calculateDaysBetween = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
};

// CSV Helpers
export const tasksToCSV = (tasks: Task[]): string => {
  const headers = [
    "ID", "Task Name", "Category", "Start Date", "End Date", 
    "Status", "Initial Cost", "Actual Cost", "Dependencies", "Notes"
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
    `"${t.notes.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const parseCSVToTasks = (csvContent: string): Task[] => {
  const lines = csvContent.split(/\r?\n/); // Handle both \n and \r\n
  const tasks: Task[] = [];
  
  // Skip header, start at 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Manual character walker for robust CSV parsing
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    
    for(let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        if (inQuote && line[charIndex + 1] === '"') {
          current += '"';
          charIndex++; // skip escaped quote
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

    // Ensure we have enough columns (allow notes to be empty/missing)
    if (values.length < 5) continue; 

    // Helper for category enum safety
    const cat = values[2] as string;
    const finalCat = Object.values(TaskCategory).includes(cat as any) ? cat : TaskCategory.OTHER;

    // Helper for status enum safety
    const stat = values[5] as string;
    const finalStat = Object.values(TaskStatus).includes(stat as any) ? stat as TaskStatus : TaskStatus.NOT_STARTED;

    // Fix dependency parsing: split, trim whitespace, remove empty strings
    const depsRaw = values[8] || '';
    const dependencies = depsRaw.split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    tasks.push({
      id: values[0] || crypto.randomUUID(), 
      name: values[1] || 'Untitled Task',
      category: finalCat,
      startDate: values[3] || new Date().toISOString().split('T')[0],
      endDate: values[4] || new Date().toISOString().split('T')[0],
      status: finalStat,
      initialCost: parseFloat(values[6]) || 0,
      actualCost: parseFloat(values[7]) || 0,
      dependencies: dependencies,
      notes: values[9] || ''
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