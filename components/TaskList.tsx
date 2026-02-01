
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, FilterState } from '../types';
import { STATUS_COLORS } from '../constants';
import { formatDate, formatCurrency, isTaskDelayed, isTaskDueSoon, isTaskActiveToday } from '../utils/helpers';

interface TaskListProps {
  tasks: Task[];
  availableCategories: string[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

type SortKey = 'startDate' | 'endDate' | 'none';
type SortOrder = 'asc' | 'desc';

export const TaskList: React.FC<TaskListProps> = ({ tasks, availableCategories, onEdit, onDelete, onStatusChange, filters, setFilters }) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Filter and Sort Logic
  const processedTasks = useMemo(() => {
    let result = tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                            task.notes.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'All' || task.category === filters.category;
      
      // Multi-status filtering
      const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
      
      // Simple date range check (overlapping)
      // Only filter by date if both the filter and the task have dates
      const matchesDate = (!filters.dateRange.start || (task.endDate && task.endDate >= filters.dateRange.start)) &&
                          (!filters.dateRange.end || (task.startDate && task.startDate <= filters.dateRange.end));

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });

    // Sorting
    if (sortKey !== 'none') {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        // Handle empty dates (put them at the end usually, or beginning if Desc)
        if (!valA && !valB) return 0;
        if (!valA) return 1; 
        if (!valB) return -1;

        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [tasks, filters, sortKey, sortOrder]);

  const toggleNote = (id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const toggleStatusFilter = (status: TaskStatus) => {
    setFilters(prev => {
      const current = prev.status;
      if (current.includes(status)) {
        return { ...prev, status: current.filter(s => s !== status) };
      } else {
        return { ...prev, status: [...current, status] };
      }
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category:</span>
              <select
                className="border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm max-w-[150px]"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="All">All Categories</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort By:</span>
              <select
                className="border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="none">Default</option>
                <option value="startDate">Start Date</option>
                <option value="endDate">End Date</option>
              </select>
              {sortKey !== 'none' && (
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="Toggle Direction"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter Status:</span>
          <div className="flex flex-wrap gap-2">
             {Object.values(TaskStatus).map(s => {
               const isActive = filters.status.includes(s);
               return (
                 <button
                   key={s}
                   onClick={() => toggleStatusFilter(s)}
                   className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                     isActive 
                       ? `${STATUS_COLORS[s]} border-transparent ring-2 ring-primary-200 ring-offset-1` 
                       : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   {s}
                 </button>
               );
             })}
             {filters.status.length > 0 && (
               <button 
                 onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
                 className="text-xs text-primary-500 hover:underline px-2"
               >
                 Clear All
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('startDate')}
                >
                  <div className="flex items-center gap-1">
                    Timeline
                    <div className="flex flex-col text-[8px] leading-[8px] text-gray-400">
                      <span className={sortKey === 'startDate' && sortOrder === 'asc' ? 'text-primary-600 font-bold' : ''}>▲</span>
                      <span className={sortKey === 'startDate' && sortOrder === 'desc' ? 'text-primary-600 font-bold' : ''}>▼</span>
                    </div>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget / Actual</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No tasks found matching your filters.
                  </td>
                </tr>
              ) : (
                processedTasks.map((task) => {
                  const isNoteExpanded = expandedTaskId === task.id;
                  const isCompleted = task.status === TaskStatus.COMPLETED;
                  const isDelayed = !isCompleted && isTaskDelayed(task);
                  const isDueSoon = !isCompleted && isTaskDueSoon(task);
                  const isActiveToday = !isCompleted && isTaskActiveToday(task);
                  
                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-gray-50 transition-all duration-300 ${isCompleted ? 'opacity-50 grayscale-[0.2]' : ''} ${isActiveToday ? 'bg-primary-50/30' : ''} ${isDelayed ? 'bg-rose-50/20' : ''}`}
                    >
                      <td className={`px-6 py-4 ${isNoteExpanded ? 'align-top' : 'whitespace-nowrap'}`}>
                        <div className="flex items-center flex-wrap gap-2">
                          {task.important && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-amber-400 flex-shrink-0">
                              <title>Important</title>
                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                          )}
                          <div className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through decoration-1' : isActiveToday ? 'text-primary-700' : 'text-gray-900'}`} title={task.name}>{task.name}</div>
                          <div className="flex gap-1">
                            {isActiveToday && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 uppercase tracking-tight border border-primary-200">
                                Today
                              </span>
                            )}
                            {isDelayed && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-tight border border-rose-200">
                                Requires Attention
                              </span>
                            )}
                            {isDueSoon && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-tight border border-blue-200">
                                Due This Week
                              </span>
                            )}
                          </div>
                        </div>
                        {task.notes && (
                          <div 
                            onClick={() => toggleNote(task.id)}
                            title={isNoteExpanded ? "Click to collapse" : "Click to view full note"}
                            className={`text-xs text-gray-500 mt-1 cursor-pointer hover:text-primary-600 transition-colors ${isNoteExpanded ? 'whitespace-pre-wrap break-words' : 'truncate max-w-xs'}`}
                          >
                            {isNoteExpanded ? (
                              <>
                                {task.notes}
                                <span className="block text-primary-400 text-[10px] mt-1 font-semibold uppercase">Show Less</span>
                              </>
                            ) : (
                              <>
                                {task.notes}
                                {task.notes.length > 40 && <span className="text-primary-400 ml-1">(more)</span>}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                        {task.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                        <div className="flex flex-col">
                          <span className={isDelayed && task.startDate && new Date(task.startDate) < new Date() && task.status === TaskStatus.NOT_STARTED ? 'text-rose-600 font-semibold' : ''}>
                            {formatDate(task.startDate)}
                          </span>
                          <span className={`text-xs ${isDelayed && task.endDate && new Date(task.endDate) < new Date() ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                            {task.endDate ? `to ${formatDate(task.endDate)}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <select
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`block w-full pl-2 pr-8 py-1 text-xs font-semibold rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 ${isDelayed ? STATUS_COLORS[TaskStatus.DELAYED] : STATUS_COLORS[task.status]}`}
                          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                        >
                          {Object.values(TaskStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {/* Overdue Check */}
                        {isDelayed && (
                          <div className="text-[10px] text-rose-500 font-bold mt-1 text-center" title="Delayed">
                            {task.endDate && new Date(task.endDate) < new Date() ? 'PAST DUE' : 'START PASSED'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                         <div className="flex flex-col">
                          <span className="font-medium">{formatCurrency(task.initialCost)}</span>
                          <span className={task.actualCost > task.initialCost ? 'text-red-500' : 'text-emerald-600 text-xs'}>
                            {formatCurrency(task.actualCost)}
                          </span>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                        <button onClick={() => onEdit(task)} className="text-primary-600 hover:text-primary-900 mr-4">Edit</button>
                        <button onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-700">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
