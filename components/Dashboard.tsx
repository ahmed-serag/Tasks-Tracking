import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Task, TaskStatus } from '../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../constants';
import { formatCurrency, formatDate } from '../utils/helpers';

interface DashboardProps {
  tasks: Task[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
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
  // - Marked as Delayed
  // - Status != Completed AND Due Date in past
  // - Start Date in past AND Status != In Progress AND Status != Completed
  const delayedTasks = tasks.filter(t => {
    if (t.status === TaskStatus.DELAYED) return true;
    
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    const isCompleted = t.status === TaskStatus.COMPLETED;
    const isInProgress = t.status === TaskStatus.IN_PROGRESS;

    // Due date passed and not done
    if (!isCompleted && end < today) return true;

    // Should have started but hasn't (Start passed, not in progress, not done)
    if (start < today && !isInProgress && !isCompleted) return true;

    return false;
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // 2. In Progress Logic
  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // 3. Due This Week Logic
  // - End date within next week
  const dueThisWeekTasks = tasks.filter(t => {
    if (t.status === TaskStatus.COMPLETED) return false;
    const end = new Date(t.endDate);
    return end >= today && end <= nextWeek;
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // 4. Upcoming Tasks (Next 5)
  // - Next 5 tasks based on End Date, future only
  // - MUST be "Not Started"
  const upcomingTasks = tasks.filter(t => {
    if (t.status !== TaskStatus.NOT_STARTED) return false;
    const end = new Date(t.endDate);
    return end > today;
  })
  .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
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
        <p className="font-medium text-gray-900 text-sm truncate">{task.name}</p>
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
                    <p className="font-medium text-gray-900 text-sm truncate">{task.name}</p>
                    <p className="text-xs text-rose-500 mt-1">
                      {task.status === TaskStatus.DELAYED ? 'Marked as Delayed' : 
                       new Date(task.endDate) < today ? 'Past Due' : 'Start Date Passed'}
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
          <div className="flex items-center gap-2 mb-4 text-amber-700">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
             <h3 className="text-lg font-serif font-semibold">In Progress</h3>
             {inProgressTasks.length > 0 && <span className="ml-auto bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">{inProgressTasks.length}</span>}
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(task => (
                <TaskListItem key={task.id} task={task} dateLabel={`Due: ${formatDate(task.endDate)}`} accentColor="amber" />
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
                <TaskListItem key={task.id} task={task} dateLabel={formatDate(task.endDate)} accentColor="emerald" />
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
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#8884d8'} />
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