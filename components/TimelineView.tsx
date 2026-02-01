
import React from 'react';
import { Task, TaskStatus } from '../types';
import { formatDate, isTaskDelayed } from '../utils/helpers';
import { STATUS_COLORS } from '../constants';

interface TimelineViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onEdit, onStatusChange }) => {
  // Sort tasks by end date (deadlines)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.endDate && !b.endDate) return 0;
    if (!a.endDate) return -1; // Unscheduled first
    if (!b.endDate) return 1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });
  
  // Group by Month Year, putting empty dates in "Unscheduled"
  const groupedTasks = sortedTasks.reduce((acc, task) => {
    let key = "Unscheduled";
    if (task.endDate) {
      const date = new Date(task.endDate);
      if (!isNaN(date.getTime())) {
        key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Determine order of keys: Chronological, then Unscheduled last
  const sortedKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMonthKey = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto p-4">
      {sortedKeys.map((monthGroup) => {
        const isCurrentMonth = monthGroup === todayMonthKey;
        const isUnscheduled = monthGroup === "Unscheduled";
        
        return (
          <div key={monthGroup} className="mb-8 relative">
            <div className={`sticky top-20 z-10 bg-elegant-cream py-2 mb-4 border-b ${isCurrentMonth ? 'border-primary-500' : isUnscheduled ? 'border-gray-300' : 'border-primary-200'}`}>
              <div className="flex items-center gap-2">
                <h3 className={`text-xl font-serif font-bold ${isCurrentMonth ? 'text-primary-600' : isUnscheduled ? 'text-gray-500 italic' : 'text-gray-800'}`}>
                  {monthGroup}
                </h3>
                {isCurrentMonth && (
                  <span className="text-[10px] font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                    CURRENT MONTH
                  </span>
                )}
              </div>
            </div>
            
            <div className={`border-l-2 ml-4 space-y-6 ${isCurrentMonth ? 'border-primary-400' : isUnscheduled ? 'border-gray-300 border-dashed' : 'border-primary-200'}`}>
              {groupedTasks[monthGroup].map((task, index) => {
                const isCompleted = task.status === TaskStatus.COMPLETED;
                const isDelayed = !isCompleted && isTaskDelayed(task);
                const taskDate = task.endDate ? new Date(task.endDate) : null;
                
                // Show today line logic
                const showTodayLine = isCurrentMonth && taskDate &&
                                    (taskDate >= today) && 
                                    (index === 0 || (groupedTasks[monthGroup][index-1].endDate && new Date(groupedTasks[monthGroup][index-1].endDate) < today));

                return (
                  <React.Fragment key={task.id}>
                    {showTodayLine && (
                      <div className="relative pl-8 mb-6">
                        <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary-600 border-2 border-white ring-4 ring-primary-100 ring-offset-0"></div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest whitespace-nowrap">Today</span>
                          <div className="h-px bg-primary-400 flex-1"></div>
                        </div>
                      </div>
                    )}
                    
                    <div className={`relative pl-8 group transition-all duration-500 ${isCompleted ? 'opacity-60' : ''}`}>
                      {/* Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white transition-colors duration-300 ${
                        isCompleted ? 'bg-emerald-500 grayscale-[0.3]' : 
                        isDelayed ? 'bg-rose-500 animate-pulse' : 
                        isUnscheduled ? 'bg-gray-400' : 'bg-primary-400'
                      }`}></div>
                      
                      <div 
                        className={`bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${isCompleted ? 'border-gray-100 bg-gray-50/30' : isDelayed ? 'border-rose-200 bg-rose-50/10' : 'border-gray-100'} ${!isCompleted && taskDate && taskDate < today ? 'border-l-4 border-l-rose-400' : ''}`}
                      >
                         <div className="flex justify-between items-start gap-4">
                            <div onClick={() => onEdit(task)} className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                {task.important && (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0">
                                    <title>Important</title>
                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <h4 className={`font-semibold transition-colors ${isCompleted ? 'text-gray-400 line-through decoration-1' : isDelayed ? 'text-rose-700' : 'text-gray-900 group-hover:text-primary-600'}`}>
                                  {task.name}
                                </h4>
                                {isDelayed && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                                    DELAYED
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>{task.category}</p>
                            </div>
                            
                            <div className="flex-shrink-0">
                              <select
                                value={task.status}
                                onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                                className={`block w-32 pl-2 pr-6 py-1 text-xs font-semibold rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 ${isDelayed ? STATUS_COLORS[TaskStatus.DELAYED] : STATUS_COLORS[task.status]}`}
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                              >
                                {Object.values(TaskStatus).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                         </div>
                         
                         {task.notes && (
                           <div onClick={() => onEdit(task)} className={`mt-2 text-xs italic truncate border-t border-gray-50 pt-2 cursor-pointer ${isCompleted ? 'text-gray-300' : 'text-gray-500'}`} title={task.notes}>
                             {task.notes}
                           </div>
                         )}

                         <div onClick={() => onEdit(task)} className="mt-3 flex items-center justify-between text-xs text-gray-400 cursor-pointer">
                            <span className={isDelayed ? 'text-rose-500 font-bold' : ''}>{task.endDate ? `Due: ${formatDate(task.endDate)}` : 'No deadline'}</span>
                            {task.actualCost > 0 && <span>Spent: ${task.actualCost}</span>}
                         </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
