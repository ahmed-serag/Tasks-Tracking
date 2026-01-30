import React from 'react';
import { Task, TaskStatus } from '../types';
import { formatDate } from '../utils/helpers';
import { STATUS_COLORS } from '../constants';

interface TimelineViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onEdit }) => {
  // Sort tasks by end date (deadlines)
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  
  // Group by Month Year
  const groupedTasks = sortedTasks.reduce((acc, task) => {
    const date = new Date(task.endDate);
    const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="max-w-3xl mx-auto p-4">
      {Object.keys(groupedTasks).map((monthGroup) => (
        <div key={monthGroup} className="mb-8 relative">
           <div className="sticky top-20 z-10 bg-elegant-cream py-2 mb-4 border-b border-primary-200">
             <h3 className="text-xl font-serif font-bold text-gray-800">{monthGroup}</h3>
           </div>
           
           <div className="border-l-2 border-primary-200 ml-4 space-y-6">
             {groupedTasks[monthGroup].map((task) => (
               <div key={task.id} className="relative pl-8 group">
                  {/* Dot */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                    task.status === TaskStatus.COMPLETED ? 'bg-emerald-500' : 'bg-primary-400'
                  }`}></div>
                  
                  <div 
                    onClick={() => onEdit(task)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  >
                     <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{task.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{task.category}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[task.status]}`}>
                          {task.status}
                        </span>
                     </div>
                     
                     {task.notes && (
                       <div className="mt-2 text-xs text-gray-500 italic truncate border-t border-gray-50 pt-2" title={task.notes}>
                         {task.notes}
                       </div>
                     )}

                     <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>Due: {formatDate(task.endDate)}</span>
                        {task.actualCost > 0 && <span>Spent: ${task.actualCost}</span>}
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      ))}
    </div>
  );
};