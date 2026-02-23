
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskType } from '../types';
import { isTaskDelayed, isTaskDueSoon, isTaskActiveToday } from '../utils/helpers';

interface TodoViewProps {
  tasks: Task[];
  onSave: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

export const TodoView: React.FC<TodoViewProps> = ({ tasks, onSave, onStatusChange, onEdit }) => {
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskType, setQuickTaskType] = useState<TaskType>('lina');

  const { linaTasks, seragTasks, completedTasks, weddingSuggestions } = useMemo(() => {
    const active = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED);

    // Personal tasks for the day
    const lina = active.filter(t => t.type === 'lina');
    const serag = active.filter(t => t.type === 'serag');

    // Wedding suggestions logic with ranking
    const suggestions = active.filter(t => {
      // Must be a wedding task (or unassigned type)
      if (t.type !== 'wedding' && t.type !== undefined) return false;
      // Must meet one of our criteria
      return isTaskDelayed(t) || isTaskDueSoon(t) || t.important || isTaskActiveToday(t);
    }).sort((a, b) => {
      // Priority Ranking: 1. Overdue, 2. Due Soon, 3. Important, 4. Today
      const getPriority = (t: Task) => {
        if (isTaskDelayed(t)) return 1;
        if (isTaskDueSoon(t)) return 2;
        if (t.important) return 3;
        if (isTaskActiveToday(t)) return 4;
        return 5;
      };
      return getPriority(a) - getPriority(b);
    }).slice(0, 6); 

    return { 
      linaTasks: lina, 
      seragTasks: serag, 
      completedTasks: completed, 
      weddingSuggestions: suggestions 
    };
  }, [tasks]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskName.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: quickTaskName,
      category: quickTaskType === 'lina' ? "Lina's errands" : "Serag's errands",
      startDate: today,
      endDate: today,
      status: TaskStatus.NOT_STARTED,
      initialCost: 0,
      actualCost: 0,
      dependencies: [],
      notes: '',
      important: false,
      type: quickTaskType
    };

    onSave(newTask);
    setQuickTaskName('');
  };

  const handleMoveToPersonal = (task: Task, targetType: TaskType) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTask: Task = {
      ...task,
      type: targetType,
      startDate: today,
      endDate: today // Ensure it shows up in today's context
    };
    onSave(updatedTask);
  };

  const getReasonLabel = (task: Task) => {
    if (isTaskDelayed(task)) {
      return { text: 'Overdue', color: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    if (isTaskDueSoon(task)) {
      return { text: 'Due Soon', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (task.important) {
      return { text: 'Important', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    if (isTaskActiveToday(task)) {
      return { text: 'Today', color: 'bg-primary-100 text-primary-700 border-primary-200' };
    }
    return { text: 'Plan Item', color: 'bg-gray-100 text-gray-500 border-gray-200' };
  };

  const TodoItem: React.FC<{ task: Task }> = ({ task }) => {
    const isCompleted = task.status === TaskStatus.COMPLETED;
    const isWedding = !task.type || task.type === 'wedding';

    return (
      <div className={`group flex items-center gap-4 p-4 bg-white rounded-xl border transition-all duration-200 hover:shadow-md ${isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
        <button 
          onClick={() => onStatusChange(task.id, isCompleted ? TaskStatus.NOT_STARTED : TaskStatus.COMPLETED)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : isWedding ? 'border-primary-300 hover:border-primary-500' : 'border-slate-300 hover:border-slate-500'
          }`}
        >
          {isCompleted && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
        </button>
        
        <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate cursor-pointer ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {task.name}
            </p>
            {task.important && <span className="text-amber-400">★</span>}
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{task.category}</p>
        </div>

        <button 
          onClick={() => onEdit(task)}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary-600 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-20">
      <div className="lg:col-span-2 space-y-8">
        <div className="text-left space-y-2">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Today's Focus</h2>
          <p className="text-gray-500 text-sm">Organize your schedules and keep the wedding planning momentum.</p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex gap-2">
          <select 
            value={quickTaskType}
            onChange={(e) => setQuickTaskType(e.target.value as TaskType)}
            className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="lina">Lina's Day</option>
            <option value="serag">Serag's Day</option>
          </select>
          <input 
            type="text"
            value={quickTaskName}
            onChange={(e) => setQuickTaskName(e.target.value)}
            placeholder="Add a new activity for today..."
            className="flex-1 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button 
            type="submit"
            disabled={!quickTaskName.trim()}
            className="bg-primary-600 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-primary-700 disabled:opacity-50 transition-all"
          >
            Add
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lina's Column */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 border-b border-primary-100 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500"></span>
              Lina's Day
            </h3>
            <div className="space-y-2">
              {linaTasks.length === 0 ? (
                <p className="text-gray-400 text-xs italic py-4 text-center">No tasks assigned for Lina yet.</p>
              ) : (
                linaTasks.map(task => <TodoItem key={task.id} task={task} />)
              )}
            </div>
          </section>

          {/* Serag's Column */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Serag's Day
            </h3>
            <div className="space-y-2">
              {seragTasks.length === 0 ? (
                <p className="text-gray-400 text-xs italic py-4 text-center">No tasks assigned for Serag yet.</p>
              ) : (
                seragTasks.map(task => <TodoItem key={task.id} task={task} />)
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Sidebar Suggestions */}
      <div className="space-y-6">
        <section className="bg-primary-50 p-6 rounded-3xl border border-primary-100 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-bold text-primary-900 uppercase tracking-widest">Wedding Focus</h3>
          </div>
          <p className="text-xs text-primary-700 leading-relaxed">
            Prioritized items from your master plan. Move them to your schedule!
          </p>
          <div className="space-y-3 pt-2">
            {weddingSuggestions.length === 0 ? (
              <div className="text-center py-6">
                 <p className="text-xs text-primary-400 italic">No wedding tasks need focus right now.</p>
              </div>
            ) : (
              weddingSuggestions.map(task => {
                const reason = getReasonLabel(task);
                return (
                  <div 
                    key={task.id} 
                    className="bg-white p-3 rounded-xl border border-primary-200 hover:border-primary-400 group transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p 
                        className="text-xs font-bold text-gray-900 group-hover:text-primary-600 leading-tight cursor-pointer"
                        onClick={() => onEdit(task)}
                      >
                        {task.name}
                      </p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter whitespace-nowrap ${reason.color}`}>
                        {reason.text}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate max-w-[80px]">{task.category}</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleMoveToPersonal(task, 'lina')}
                          className="px-2 py-1 bg-primary-600 text-white text-[9px] font-bold rounded-md hover:bg-primary-700 transition-colors shadow-sm"
                          title="Assign to Lina"
                        >
                          + Lina
                        </button>
                        <button 
                          onClick={() => handleMoveToPersonal(task, 'serag')}
                          className="px-2 py-1 bg-slate-700 text-white text-[9px] font-bold rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                          title="Assign to Serag"
                        >
                          + Serag
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Team Strategy</h4>
           <p className="text-xs text-slate-600 leading-relaxed">
             Divide and conquer! Move one focus item to Lina and one to Serag to double your planning speed today.
           </p>
        </div>
      </div>

      {/* Accomplished Section Moved to Bottom */}
      {completedTasks.length > 0 && (
        <div className="lg:col-span-3 pt-8 border-t border-gray-100">
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              Recently Accomplished
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {completedTasks.slice(0, 8).map(task => <TodoItem key={task.id} task={task} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
