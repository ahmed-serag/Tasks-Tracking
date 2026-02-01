
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskCategory } from '../types';
import { calculateDaysBetween, formatDate, isTaskDelayed, getCategoryColor } from '../utils/helpers';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface CategorySpan {
  name: string;
  startDate: string;
  endDate: string;
  tasks: Task[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick }) => {
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  // Filter out tasks that don't have valid dates
  const scheduledTasks = useMemo(() => {
    return tasks.filter(t => t.startDate && t.endDate);
  }, [tasks]);

  const hasUnscheduledTasks = tasks.length > scheduledTasks.length;

  // Group tasks by category for the top level
  const categorySpans = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    scheduledTasks.forEach(t => {
      const cat = t.category || TaskCategory.OTHER;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });

    return Object.entries(groups).map(([name, categoryTasks]) => {
      const validStartDates = categoryTasks.map(t => new Date(t.startDate).getTime()).filter(t => !isNaN(t));
      const validEndDates = categoryTasks.map(t => new Date(t.endDate).getTime()).filter(t => !isNaN(t));
      
      const start = validStartDates.length > 0 ? Math.min(...validStartDates) : new Date().getTime();
      const end = validEndDates.length > 0 ? Math.max(...validEndDates) : new Date().getTime();

      return {
        name,
        startDate: new Date(start).toISOString().split('T')[0],
        endDate: new Date(end).toISOString().split('T')[0],
        tasks: categoryTasks
      } as CategorySpan;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [scheduledTasks]);

  const displayedData = drilldownCategory 
    ? scheduledTasks.filter(t => (t.category || TaskCategory.OTHER) === drilldownCategory).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : categorySpans;

  if (tasks.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-500">Start by adding some tasks to see your timeline.</p>
      </div>
    );
  }

  if (scheduledTasks.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
        <div className="mx-auto h-12 w-12 text-gray-300 flex items-center justify-center bg-gray-50 rounded-full">
           <span className="text-xl">📅</span>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled tasks</h3>
        <p className="mt-1 text-sm text-gray-500">Add start and end dates to your tasks to see them on the timeline.</p>
      </div>
    );
  }

  // 1. Determine timeline range for the current view
  const rawDates = drilldownCategory 
    ? (displayedData as Task[]).flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()])
    : categorySpans.flatMap(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()]);
  
  const validDates = rawDates.filter(d => !isNaN(d));
  const minDate = validDates.length > 0 ? Math.min(...validDates) : new Date().getTime();
  const maxDate = validDates.length > 0 ? Math.max(...validDates) : new Date().getTime();
  
  // Add buffer (1 week before and after)
  const chartStart = new Date(minDate - 7 * 24 * 60 * 60 * 1000);
  const chartEnd = new Date(maxDate + 7 * 24 * 60 * 60 * 1000);
  
  // Guard against invalid dates
  const chartStartIso = !isNaN(chartStart.getTime()) ? chartStart.toISOString() : new Date().toISOString();
  const chartEndIso = !isNaN(chartEnd.getTime()) ? chartEnd.toISOString() : new Date().toISOString();
  
  const totalDurationDays = calculateDaysBetween(chartStartIso, chartEndIso);

  // 2. Generate Time Headers (Months)
  const months: { name: string, days: number, widthPct: number }[] = [];
  let currentDate = new Date(chartStart);
  if (isNaN(currentDate.getTime())) currentDate = new Date();
  
  while (currentDate <= chartEnd) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const nextMonth = new Date(year, month + 1, 1);
    
    const relevantStart = monthStart < chartStart ? chartStart : monthStart;
    const relevantEnd = monthEnd > chartEnd ? chartEnd : monthEnd;
    const days = Math.ceil((relevantEnd.getTime() - relevantStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (days > 0 && totalDurationDays > 0) {
       months.push({
        name: new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(currentDate),
        days,
        widthPct: (days / totalDurationDays) * 100
      });
    }
    currentDate = nextMonth;
    if (months.length > 100) break; // Safety
  }

  // 3. Helper to position bars
  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || isNaN(chartStart.getTime()) || totalDurationDays <= 0) return 0;
    const diffDays = Math.ceil((date.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24));
    return (diffDays / totalDurationDays) * 100;
  };

  const getWidth = (start: string, end: string) => {
    if (totalDurationDays <= 0) return 0;
    const days = calculateDaysBetween(start, end);
    return (days / totalDurationDays) * 100;
  };

  // Today Indicator Logic
  const todayPos = getPosition(new Date().toISOString().split('T')[0]);
  const isTodayVisible = todayPos >= 0 && todayPos <= 100;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header / Breadcrumbs */}
      <div className="flex items-center justify-between mb-6">
        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
          <button 
            onClick={() => setDrilldownCategory(null)}
            className={`text-lg font-serif font-bold transition-colors ${drilldownCategory ? 'text-gray-400 hover:text-primary-600' : 'text-gray-900'}`}
          >
            Planning Timeline
          </button>
          {drilldownCategory && (
            <>
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <h2 className="text-lg font-serif font-bold text-gray-900">{drilldownCategory}</h2>
            </>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {hasUnscheduledTasks && (
            <span className="text-xs text-gray-400 italic">
              * {tasks.length - scheduledTasks.length} tasks hidden (no dates)
            </span>
          )}
          {drilldownCategory && (
            <button 
              onClick={() => setDrilldownCategory(null)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Overview
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto relative rounded-lg border border-gray-100">
        <div className="min-w-[1200px] relative pb-4"> 
          
          {/* Timeline Ruler */}
          <div className="flex border-b border-gray-200 pb-2 mb-2 sticky top-0 bg-white z-20">
            <div className="w-64 flex-shrink-0 font-serif font-bold text-gray-700 sticky left-0 bg-white z-30 border-r border-gray-100 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] h-8 flex items-center">
              {drilldownCategory ? 'Task Name' : 'Category Overview'}
            </div>
            <div className="flex-1 flex relative h-8">
              {months.map((m, idx) => (
                <div key={idx} style={{ width: `${m.widthPct}%` }} className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 border-l border-gray-100 px-2 flex items-center truncate">
                  {m.name}
                </div>
              ))}
            </div>
          </div>

          {/* Today Indicator Line (Overlay) */}
          {isTodayVisible && (
            <div 
              className="absolute top-0 bottom-0 z-10 w-px bg-primary-500/60 pointer-events-none" 
              style={{ left: `calc(16rem + (100% - 16rem) * ${todayPos / 100})` }}
            >
              <div className="absolute top-0 -translate-x-1/2 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                TODAY
              </div>
            </div>
          )}

          {/* Rows Container */}
          <div className="space-y-1">
            {displayedData.map(item => {
              const isTask = 'status' in item;
              const task = isTask ? (item as Task) : null;
              const category = !isTask ? (item as CategorySpan) : null;
              
              const name = isTask ? task!.name : category!.name;
              const startDate = isTask ? task!.startDate : category!.startDate;
              const endDate = isTask ? task!.endDate : category!.endDate;
              
              const left = getPosition(startDate);
              const width = getWidth(startDate, endDate);
              const finalWidth = Math.max(width, 0.5); // Minimal width for visibility
              
              const isCompleted = task?.status === TaskStatus.COMPLETED;
              const isDelayed = task ? isTaskDelayed(task) : false;
              
              // Styling based on status/category
              let barColor = 'bg-slate-300';
              if (isTask) {
                if (isDelayed) barColor = 'bg-rose-400';
                else if (isCompleted) barColor = 'bg-emerald-400';
                else if (task!.status === TaskStatus.IN_PROGRESS) barColor = 'bg-amber-400';
              }

              // const formattedDateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

              return (
                <div key={isTask ? task!.id : category!.name} className="flex items-center group/row hover:bg-gray-50/50 transition-colors">
                  {/* Row Label (Sticky) */}
                  <div className={`w-64 flex-shrink-0 pr-4 sticky left-0 bg-white z-20 border-r border-gray-100 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] h-12 flex flex-col justify-center ${isCompleted ? 'opacity-50' : ''}`}>
                    <div 
                      className={`flex items-center gap-1.5 text-sm font-medium truncate ${isDelayed ? 'text-rose-600 font-bold' : isCompleted ? 'text-gray-400 line-through decoration-1' : 'text-gray-900'} hover:text-primary-600 transition-colors cursor-pointer group-hover/row:translate-x-1 duration-200`} 
                      title={name}
                      onClick={() => isTask ? onTaskClick(task!) : setDrilldownCategory(category!.name)}
                    >
                      {isTask && task!.important && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-amber-500 flex-shrink-0">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="truncate">{name}</span>
                    </div>
                    {!isTask && (
                      <span className="text-[10px] text-gray-400 font-normal">
                        {category!.tasks.length} {category!.tasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                  
                  {/* Timeline Bar Track */}
                  <div className={`flex-1 relative h-12 flex items-center px-1`}>
                     {/* Vertical Grid Lines */}
                     <div className="absolute inset-0 flex pointer-events-none">
                        {months.map((m, idx) => (
                          <div key={idx} style={{ width: `${m.widthPct}%` }} className="border-l border-gray-100 h-full opacity-50"></div>
                        ))}
                     </div>
                     
                     {/* The Interactive Bar */}
                     <div 
                        onClick={() => isTask ? onTaskClick(task!) : setDrilldownCategory(category!.name)}
                        className={`absolute h-6 rounded shadow-sm cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary-300 transition-all group/bar flex items-center px-2 overflow-hidden ${barColor} ${isCompleted ? 'opacity-40 grayscale-[0.3]' : ''}`}
                        style={{ 
                          left: `${left}%`, 
                          width: `${finalWidth}%`,
                          backgroundColor: !isTask ? getCategoryColor(category!.name) : undefined
                        }}
                     >
                        {/* Inline Label (Visible if wide enough) */}
                        <span className={`text-[10px] font-bold truncate pointer-events-none ${isDelayed || !isTask ? 'text-white' : 'text-slate-800'}`}>
                           {name}
                        </span>

                        {/* Tooltip removed */}
                        
                        {/* Dependency Dot */}
                        {isTask && task!.dependencies.length > 0 && (
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-gray-500 border border-white"></div>
                        )}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Footer / Legend */}
          <div className="mt-8 flex flex-wrap gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest justify-center sticky left-0">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary-500/60 rounded-sm"></div> Today Indicator</div>
            {drilldownCategory ? (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-300 rounded shadow-sm"></div> Not Started</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 rounded shadow-sm"></div> In Progress</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded shadow-sm opacity-50"></div> Completed (Dimmed)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded shadow-sm animate-pulse"></div> Needs Attention</div>
              </>
            ) : (
              <div className="flex items-center gap-2 italic animate-pulse text-primary-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                Click a category to see its task breakdown
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
