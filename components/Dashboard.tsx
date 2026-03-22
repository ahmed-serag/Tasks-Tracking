
import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Task, TaskStatus } from '../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../constants';
import { formatCurrency, formatDate, isTaskDelayed, isTaskDueSoon, compareDates, getCategoryColor } from '../utils/helpers';

interface DashboardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  prioritySort: boolean;
  onPrioritySortChange: (val: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, onTaskClick, prioritySort, onPrioritySortChange }) => {
  const totalBudget = tasks.reduce((acc, t) => acc + t.initialCost, 0);
  const totalActual = tasks.reduce((acc, t) => acc + t.actualCost, 0);
  const remainingBudget = totalBudget - totalActual;
  
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // 1. Critical Tasks (Requires Attention/Delayed)
  const delayedTasks = tasks.filter(t => isTaskDelayed(t))
    .sort((a, b) => compareDates(a.endDate, b.endDate));

  const delayedIds = new Set(delayedTasks.map(t => t.id));

  // 2. Due This Week
  const dueThisWeekTasks = tasks.filter(t => 
    !delayedIds.has(t.id) && isTaskDueSoon(t)
  ).sort((a, b) => compareDates(a.endDate, b.endDate));

  const dueSoonIds = new Set(dueThisWeekTasks.map(t => t.id));

  // 3. Active (In Progress)
  // UPDATED: No longer excluding dueSoonIds so that In Progress tasks due this week show here too.
  const inProgressTasks = tasks.filter(t => 
    !delayedIds.has(t.id) && 
    t.status === TaskStatus.IN_PROGRESS
  ).sort((a, b) => {
    if (prioritySort) {
      if (a.important && !b.important) return -1;
      if (!a.important && b.important) return 1;
    }
    return compareDates(a.endDate, b.endDate);
  });

  // 4. Upcoming
  const upcomingTasks = tasks.filter(t => 
    !delayedIds.has(t.id) && 
    !dueSoonIds.has(t.id) && 
    t.status === TaskStatus.NOT_STARTED &&
    (!t.endDate || new Date(t.endDate) > today)
  )
  .sort((a, b) => compareDates(a.endDate, b.endDate))
  .slice(0, 5);

  const categoryData: { name: string; value: number }[] = Object.values(tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = { name: task.category, value: 0 };
    }
    acc[task.category].value += task.initialCost;
    return acc;
  }, {} as Record<string, { name: string, value: number }>));

  const costVarianceData = [...tasks]
    .sort((a, b) => b.initialCost - a.initialCost)
    .slice(0, 5)
    .map(t => ({
      name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      Budget: t.initialCost,
      Actual: t.actualCost
    }));

  const TaskListItem: React.FC<{ task: Task; dateLabel: string; accentColor: string }> = ({ task, dateLabel, accentColor }) => {
    const isDueSoon = isTaskDueSoon(task);
    
    return (
      <div 
        onClick={() => onTaskClick(task)}
        className={`flex justify-between items-center p-3 rounded-md border border-${accentColor}-100 bg-${accentColor}-50/50 hover:bg-${accentColor}-100 transition-colors cursor-pointer group`}
      >
        <div className="min-w-0 flex-1 mr-2">
          <div className="flex items-center gap-2">
            {task.important && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            )}
            <p className="font-medium text-gray-900 text-sm truncate group-hover:text-primary-600">{task.name}</p>
            {isDueSoon && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-tight border border-blue-200">
                Due This Week
              </span>
            )}
          </div>
          <p className={`text-xs text-${accentColor}-600 mt-1`}>{task.category}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-semibold text-${accentColor}-700`}>{dateLabel}</p>
          <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 mt-1 inline-block">
            {task.status}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Budget</h3>
          <p className="mt-2 text-3xl font-serif font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Actual Spent</h3>
          <p className={`mt-2 text-3xl font-serif font-bold ${totalActual > totalBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(totalActual)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Remaining</h3>
          <p className="mt-2 text-3xl font-serif font-bold text-gray-900">{formatCurrency(remainingBudget)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Progress</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-primary-600">{progressPercentage}%</span>
            <span className="text-sm text-gray-500">completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requires Attention */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border ${delayedTasks.length > 0 ? 'border-rose-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-4 text-rose-700">
             <h3 className="text-lg font-serif font-semibold">Requires Attention</h3>
             {delayedTasks.length > 0 && <span className="ml-auto bg-rose-100 text-rose-800 text-xs font-bold px-2 py-1 rounded-full">{delayedTasks.length}</span>}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {delayedTasks.length > 0 ? (
              delayedTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => onTaskClick(task)}
                  className="flex justify-between items-start p-3 bg-rose-50 rounded-md border border-rose-100 hover:bg-rose-100 cursor-pointer group transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-2">
                       {task.important && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                          </svg>
                        )}
                      <p className="font-medium text-gray-900 text-sm truncate group-hover:text-primary-600">{task.name}</p>
                    </div>
                    <p className="text-[10px] text-rose-600 uppercase tracking-tight font-bold mt-0.5">{task.category}</p>
                    <p className="text-xs text-rose-500 mt-0.5">
                      {task.status === TaskStatus.DELAYED ? 'Marked as Delayed' : 
                       (task.endDate && new Date(task.endDate) < today) ? 'Past Due' : 'Start Date Passed'}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap flex flex-col items-end justify-center">
                    <p className="text-[10px] text-rose-500 font-medium mb-0.5">Start: {formatDate(task.startDate)}</p>
                    <p className="text-xs font-bold text-rose-700">Due: {formatDate(task.endDate)}</p>
                  </div>
                </div>
              ))
            ) : <p className="text-gray-400 text-sm italic py-2">No delayed tasks.</p>}
          </div>
        </div>

        {/* Due This Week */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center gap-2 mb-4 text-blue-700">
             <h3 className="text-lg font-serif font-semibold">Due This Week</h3>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {dueThisWeekTasks.length > 0 ? (
              dueThisWeekTasks.map(task => (
                <TaskListItem key={task.id} task={task} dateLabel={formatDate(task.endDate)} accentColor="blue" />
              ))
            ) : <p className="text-gray-400 text-sm italic py-2">Nothing due this week.</p>}
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between mb-4 text-amber-700">
             <h3 className="text-lg font-serif font-semibold">In Progress</h3>
             <label className="flex items-center gap-2 cursor-pointer group select-none">
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${prioritySort ? 'text-amber-800' : 'text-amber-800/50'}`}>
                  Priority
                </span>
                <div className="relative">
                   <input 
                     type="checkbox" 
                     className="sr-only"
                     checked={prioritySort}
                     onChange={(e) => onPrioritySortChange(e.target.checked)}
                   />
                   <div className={`block w-8 h-4 rounded-full transition-colors ${prioritySort ? 'bg-amber-500' : 'bg-amber-200'}`}></div>
                   <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${prioritySort ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
             </label>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => (
                <TaskListItem key={task.id} task={task} dateLabel={task.endDate ? `Due: ${formatDate(task.endDate)}` : 'No deadline'} accentColor="amber" />
              ))
            ) : <p className="text-gray-400 text-sm italic py-2">No other active tasks.</p>}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
             <h3 className="text-lg font-serif font-semibold">Upcoming Tasks</h3>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => (
                <TaskListItem 
                  key={task.id} 
                  task={task} 
                  dateLabel={task.startDate ? `Starts: ${formatDate(task.startDate)}` : (task.endDate ? `Due: ${formatDate(task.endDate)}` : 'TBD')} 
                  accentColor="emerald" 
                />
              ))
            ) : <p className="text-gray-400 text-sm italic py-2">No other upcoming tasks.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-serif font-semibold text-gray-800 mb-6">Budget by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name) || '#8884d8'} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-serif font-semibold text-gray-800 mb-6">Budget vs Actual (Top Costs)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costVarianceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
