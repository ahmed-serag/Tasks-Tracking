import React, { useState } from 'react';
import { Task, TaskCategory, TaskStatus, FilterState } from '../types';
import { STATUS_COLORS } from '../constants';
import { formatDate, formatCurrency } from '../utils/helpers';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onEdit, onDelete, onStatusChange, filters, setFilters }) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Filter Logic
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                          task.notes.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.category === 'All' || task.category === filters.category;
    const matchesStatus = filters.status === 'All' || task.status === filters.status;
    
    // Simple date range check (overlapping)
    const matchesDate = (!filters.dateRange.start || task.endDate >= filters.dateRange.start) &&
                        (!filters.dateRange.end || task.startDate <= filters.dateRange.end);

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  const toggleNote = (id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
        >
          <option value="All">All Categories</option>
          {Object.values(TaskCategory).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2 text-sm"
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="All">All Statuses</option>
          {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget / Actual</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No tasks found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isNoteExpanded = expandedTaskId === task.id;
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className={`px-6 py-4 ${isNoteExpanded ? 'align-top' : 'whitespace-nowrap'}`}>
                        <div className="text-sm font-medium text-gray-900">{task.name}</div>
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
                          <span>{formatDate(task.startDate)}</span>
                          <span className="text-xs text-gray-400">to {formatDate(task.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <select
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`block w-full pl-2 pr-8 py-1 text-xs font-semibold rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 ${STATUS_COLORS[task.status]}`}
                          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                        >
                          {Object.values(TaskStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {/* Overdue Check */}
                        {task.status !== TaskStatus.COMPLETED && new Date(task.endDate) < new Date() && (
                          <div className="text-xs text-red-500 font-bold mt-1 text-center" title="Overdue">Overdue</div>
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