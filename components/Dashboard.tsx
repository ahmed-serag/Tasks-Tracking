import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Task, TaskStatus } from '../types';
import { CATEGORY_COLORS, STATUS_COLORS } from '../constants';
import { formatCurrency } from '../utils/helpers';

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

  // Prepare Pie Chart Data (Budget vs Actual by Category)
  const categoryData: { name: string; value: number }[] = Object.values(tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = { name: task.category, value: 0 };
    }
    acc[task.category].value += task.initialCost;
    return acc;
  }, {} as Record<string, { name: string, value: number }>));

  // Prepare Bar Chart Data (Cost Variance: Budget vs Actual per task - Top 5 most expensive)
  const costVarianceData = [...tasks]
    .sort((a, b) => b.initialCost - a.initialCost)
    .slice(0, 5)
    .map(t => ({
      name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      Budget: t.initialCost,
      Actual: t.actualCost
    }));

  // Prepare Status Distribution Data
  const statusData = Object.values(TaskStatus).map(status => ({
    name: status,
    count: tasks.filter(t => t.status === status).length
  }));

  return (
    <div className="space-y-8 animate-fade-in">
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

      {/* Charts Row 1 */}
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