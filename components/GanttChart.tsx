import React from 'react';
import { Task, TaskStatus } from '../types';
import { calculateDaysBetween, formatDate } from '../utils/helpers';
import { STATUS_COLORS } from '../constants';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick }) => {
  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks to display in Gantt chart.</div>;
  }

  // 1. Determine timeline range
  const dates = tasks.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  
  // Add buffer (1 week before and after)
  const chartStart = new Date(minDate - 7 * 24 * 60 * 60 * 1000);
  const chartEnd = new Date(maxDate + 7 * 24 * 60 * 60 * 1000);
  const totalDurationDays = calculateDaysBetween(chartStart.toISOString(), chartEnd.toISOString());

  // 2. Generate Time Headers (Months)
  const months: { name: string, days: number, widthPct: number }[] = [];
  let currentDate = new Date(chartStart);
  
  while (currentDate <= chartEnd) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Calculate overlap with chart range
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    // Simple logic: iterate month by month
    // Just for display, roughly distribute
    const nextMonth = new Date(year, month + 1, 1);
    
    const relevantStart = monthStart < chartStart ? chartStart : monthStart;
    const relevantEnd = monthEnd > chartEnd ? chartEnd : monthEnd;
    const days = Math.ceil((relevantEnd.getTime() - relevantStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (days > 0) {
       months.push({
        name: new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(currentDate),
        days,
        widthPct: (days / totalDurationDays) * 100
      });
    }
    
    currentDate = nextMonth;
  }

  // 3. Helper to position bars
  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24));
    return (diffDays / totalDurationDays) * 100;
  };

  const getWidth = (start: string, end: string) => {
    const days = calculateDaysBetween(start, end);
    return (days / totalDurationDays) * 100;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <div className="min-w-[800px]"> {/* Force scroll on small screens */}
        
        {/* Header */}
        <div className="flex border-b border-gray-200 pb-2 mb-4">
          <div className="w-48 flex-shrink-0 font-serif font-bold text-gray-700">Task Name</div>
          <div className="flex-1 flex relative h-8">
            {months.map((m, idx) => (
              <div key={idx} style={{ width: `${m.widthPct}%` }} className="text-xs text-gray-500 border-l border-gray-100 px-1 truncate">
                {m.name}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {tasks.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => {
            const left = getPosition(task.startDate);
            const width = getWidth(task.startDate, task.endDate);
            // Clamp width min to be visible
            const finalWidth = Math.max(width, 1); 
            
            // Generate visual color class based on status
            const colorClass = task.status === TaskStatus.COMPLETED ? 'bg-emerald-400' :
                               task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-400' :
                               task.status === TaskStatus.DELAYED ? 'bg-rose-400' : 'bg-slate-300';

            return (
              <div key={task.id} className="flex items-center group">
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="text-sm font-medium text-gray-900 truncate" title={task.name}>{task.name}</div>
                  <div className="text-xs text-gray-400">{formatDate(task.startDate)}</div>
                </div>
                <div className="flex-1 relative h-8 bg-gray-50 rounded-md">
                   {/* Grid Lines (Visual Guide) */}
                   <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((m, idx) => (
                        <div key={idx} style={{ width: `${m.widthPct}%` }} className="border-l border-gray-100 h-full"></div>
                      ))}
                   </div>
                   
                   {/* The Task Bar */}
                   <div 
                      onClick={() => onTaskClick(task)}
                      className={`absolute top-1.5 h-5 rounded-md shadow-sm cursor-pointer hover:opacity-80 transition-all ${colorClass}`}
                      style={{ left: `${left}%`, width: `${finalWidth}%` }}
                   >
                     {/* Dependency Connector (Simple dot indicator if needed, or visual link logic is too complex for simple div gantt) */}
                     {task.dependencies.length > 0 && (
                        <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-gray-400 border border-white"></div>
                     )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex gap-4 text-xs text-gray-500 justify-end">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-300 rounded"></div> Not Started</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded"></div> In Progress</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded"></div> Completed</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-400 rounded"></div> Delayed</div>
        </div>
      </div>
    </div>
  );
};