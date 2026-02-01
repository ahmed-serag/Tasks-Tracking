
import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Task, TaskStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { formatCurrency, formatDate, isTaskDelayed, isTaskDueSoon, getCategoryColor } from '../utils/helpers';

interface DashboardProps {
  tasks: Task[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const [sortInProgressByImportance, setSortInProgressByImportance] = useState(false);

  const totalBudget = tasks.reduce((acc, t) => acc + t.initialCost, 0);
  const totalActual = tasks.reduce((acc, t) => acc + t.actualCost, 0);
  const remainingBudget = totalBudget - totalActual;
  
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  // --- List Logic ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // 1. Delayed Logic
  const delayedTasks = tasks.filter(t => {
    if (t.status === TaskStatus.DELAYED) return true;
    
    // Skip if no dates
    if (!t.startDate || !t.endDate) return false;

    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    const isCompleted = t.status === TaskStatus.COMPLETED;
    const isInProgress = t.status === TaskStatus.IN_PROGRESS;

    if (!isCompleted && end < today) return true;
    if (start < today && !isInProgress && !isCompleted) return true;

    return false;
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // 2. In Progress Logic
  const inProgressTasks = tasks.filter(t => {
    if (t.status !== TaskStatus.IN_PROGRESS) return false;

    // Filter out if it counts as "Due This Week" to avoid duplication
    if (t.endDate) {
      const end = new Date(t.endDate);
      // Check if it falls in the "Due This Week" range (Today -> Next Week)
      if (end >= today && end <= nextWeek) {
        return false; 
      }
    }
    
    return true;
  }).sort((a, b) => {
      // Sort by importance if enabled
      if (sortInProgressByImportance) {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
      }

      // Sort in-progress tasks by end date, putting tasks with no end date last
      if (!a.endDate) return 1;
      if (!b.endDate) return -1;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

  // 3. Due This Week Logic
  const dueThisWeekTasks = tasks.filter(t => {
    if (t.status === TaskStatus.COMPLETED) return false;
    if (!t.endDate) return false;
    const end = new Date(t.endDate);
    return end >= today && end <= nextWeek;
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // 4. Upcoming Tasks (Next 5)
  // - MUST be "Not Started"
  // - Sorted by Start Date (soonest first)
  const upcomingTasks = tasks.filter(t => {
    if (t.status !== TaskStatus.NOT_STARTED) return false;
    
    // Filter out delayed tasks (those that should have started already)
    // Delayed logic covers: status==NOT_STARTED && start < today
    if (t.startDate) {
      const start = new Date(t.startDate);
      if (start < today) return false; 
    } else if (t.endDate) {
      // If no start date, check end date to ensure it's not overdue
      const end = new Date(t.endDate);
      if (end < today) return false;
    }

    return true;
  })
  .sort((a, b) => {
    // Priority: Start Date -> End Date -> Unscheduled Last
    const dateA = a.startDate ? new Date(a.startDate).getTime() : (a.endDate ? new Date(a.endDate).getTime() : Number.MAX_VALUE);
    const dateB = b.startDate ? new Date(b.startDate).getTime() : (b.endDate ? new Date(b.endDate).getTime() : Number.MAX_VALUE);
    return dateA - dateB;
  })
  .slice(0, 5);

  // --- Chart Data Prep ---
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

  const statusData = Object.values(TaskStatus).map(status => ({
    name: status,
    count: tasks.filter(t => t.status === status).length
  }));

  // Reusable List Component
  const TaskListItem = ({ task, dateLabel, accentColor }: { task: Task, dateLabel: string, accentColor: string }) => (
    <div className={`flex justify-between items-center p-3 rounded-md border border-${accentColor}-100 bg-${accentColor}-50/50 hover:bg-${accentColor}-50 transition-colors`}>
      <div className="min-w-0 flex-1 mr-2">
        <div className="flex items-center gap-1.5">
          {task.important && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
          )}
          <p className="font-medium text-gray-900 text-sm truncate">{task.name}</p>
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

      {/* Task Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Delayed Tasks */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border ${delayedTasks.length > 0 ? 'border-rose-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-4 text-rose-700">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <h3 className="text-lg font-serif font-semibold">Requires Attention</h3>
             {delayedTasks.length > 0 && <span className="ml-auto bg-rose-100 text-rose-800 text-xs font-bold px-2 py-1 rounded-full">{delayedTasks.length}</span>}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {delayedTasks.length > 0 ? (
              delayedTasks.map(task => (
                <div key={task.id} className="flex justify-between items-start p-3 bg-rose-50 rounded-md border border-rose-100">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1.5">
                      {task.important && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      )}
                      <p className="font-medium text-gray-900 text-sm truncate">{task.name}</p>
                    </div>
                    <p className="text-xs text-rose-500 mt-1">
                      {task.status === TaskStatus.DELAYED ? 'Marked as Delayed' : 
                       (task.endDate && new Date(task.endDate) < today) ? 'Past Due' : 'Start Date Passed'}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-xs font-bold text-rose-700">{formatDate(task.endDate)}</p>
                  </div>
                </div>
              ))
            ) : (
               <p className="text-gray-400 text-sm italic py-2">No delayed tasks.</p>
            )}
          </div>
        </div>

        {/* 2. In Progress Tasks */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between mb-4 text-amber-700">
             <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-serif font-semibold">In Progress</h3>
                {inProgressTasks.length > 0 && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">{inProgressTasks.length}</span>}
             </div>
             
             <label className="flex items-center gap-2 cursor-pointer group select-none">
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${sortInProgressByImportance ? 'text-amber-800' : 'text-amber-800/50'}`}>
                  Priority
                </span>
                <div className="relative">
                   <input 
                     type="checkbox" 
                     className="sr-only"
                     checked={sortInProgressByImportance}
                     onChange={(e) => setSortInProgressByImportance(e.target.checked)}
                   />
                   <div className={`block w-8 h-4 rounded-full transition-colors ${sortInProgressByImportance ? 'bg-amber-500' : 'bg-amber-200'}`}></div>
                   <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${sortInProgressByImportance ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
             </label>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => (
                <TaskListItem key={task.id} task={task} dateLabel={task.endDate ? `Due: ${formatDate(task.endDate)}` : 'No deadline'} accentColor="amber" />
              ))
            ) : (
               <p className="text-gray-400 text-sm italic py-2">No tasks currently in progress.</p>
            )}
          </div>
        </div>

        {/* 3. Due This Week */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center gap-2 mb-4 text-blue-700">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
             <h3 className="text-lg font-serif font-semibold">Due This Week</h3>
             {dueThisWeekTasks.length > 0 && <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{dueThisWeekTasks.length}</span>}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {dueThisWeekTasks.length > 0 ? (
              dueThisWeekTasks.map(task => (
                <TaskListItem key={task.id} task={task} dateLabel={formatDate(task.endDate)} accentColor="blue" />
              ))
            ) : (
               <p className="text-gray-400 text-sm italic py-2">Nothing due in the next 7 days.</p>
            )}
          </div>
        </div>

        {/* 4. Upcoming Tasks (Next 5) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
             </svg>
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
            ) : (
               <p className="text-gray-400 text-sm italic py-2">No upcoming Not Started tasks found.</p>
            )}
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-serif font-semibold text-gray-800 mb-6">Budget by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Variance */}
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

      {/* Status Breakdown Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-serif font-semibold text-gray-800 mb-4">Task Status Overview</h3>
          <div className="flex w-full h-4 rounded-full overflow-hidden">
            {statusData.map((item) => (
               item.count > 0 && (
                <div 
                  key={item.name} 
                  style={{ flex: item.count }} 
                  className={`h-full relative group ${STATUS_COLORS[item.name as TaskStatus].split(' ')[0]}`}
                  title={`${item.name}: ${item.count}`}
                >
                </div>
               )
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {statusData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[item.name as TaskStatus].split(' ')[0]}`}></div>
                 <span className="text-sm text-gray-600">{item.name} ({item.count})</span>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};
