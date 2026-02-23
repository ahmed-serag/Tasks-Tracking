
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { GanttChart } from './components/GanttChart';
import { TimelineView } from './components/TimelineView';
import { TodoView } from './components/TodoView';
import { CsvManager } from './components/CsvManager';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Task, ViewMode, FilterState, TaskStatus } from './types';
import { taskService } from './services/api';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [dashboardPrioritySort, setDashboardPrioritySort] = useState(() => {
    const saved = localStorage.getItem('blissplan_priority_sort');
    return saved === 'true';
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    status: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS], 
    dateRange: { start: '', end: '' }
  });

  const weddingTasks = useMemo(() => tasks.filter(t => !t.type || t.type === 'wedding'), [tasks]);

  const weddingCategories = useMemo(() => {
    const used = weddingTasks.map(t => t.category);
    return Array.from(new Set(used.filter(c => c && c.trim() !== ''))).sort();
  }, [weddingTasks]);

  useEffect(() => {
    localStorage.setItem('blissplan_priority_sort', dashboardPrioritySort.toString());
  }, [dashboardPrioritySort]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        const fetchedTasks = await taskService.fetchTasks();
        setTasks(fetchedTasks);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const handleSaveTask = async (task: Task) => {
    try {
      setIsSaving(true);
      const isNew = !tasks.some(t => t.id === task.id);
      const taskWithDefaults = { ...task, type: task.type || 'wedding' };
      const savedTask = await taskService.saveTask(taskWithDefaults, isNew);
      setTasks(prev => {
        if (isNew) return [...prev, savedTask];
        return prev.map(t => t.id === savedTask.id ? savedTask : t);
      });
      showNotification(isNew ? "Task created successfully" : "Task updated successfully", 'success');
      setError(null);
    } catch (err) {
      console.error(err);
      showNotification("Failed to save task", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedTask = { ...task, status: newStatus };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    try {
      await taskService.saveTask(updatedTask, false);
      showNotification(`Task marked as ${newStatus}`, 'success');
    } catch (err) {
      console.error(err);
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
      showNotification("Failed to update status", 'error');
    }
  };

  const confirmDeleteTask = (id: string) => {
    setTaskToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const executeDeleteTask = async () => {
    if (!taskToDeleteId) return;
    try {
      setIsConfirmOpen(false);
      setIsSaving(true);
      await taskService.deleteTask(taskToDeleteId);
      setTasks(prev => prev.filter(t => t.id !== taskToDeleteId));
      setIsModalOpen(false);
      showNotification("Task deleted", 'success');
      setError(null);
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete task", 'error');
    } finally {
      setIsSaving(false);
      setTaskToDeleteId(null);
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleImport = async (newTasks: Task[]) => {
    if (newTasks.length === 0) return;
    try {
      setIsSaving(true); 
      const syncedTasks = await taskService.clearAndReplaceAllTasks(newTasks);
      setTasks(syncedTasks);
      showNotification(`Successfully reset plan with ${newTasks.length} tasks`, 'success');
    } catch (err: any) {
      console.error("Import failed:", err);
      showNotification(err.message || "Failed to import tasks", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mb-4"></div>
           <p>Loading your planner...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-lg text-red-600 border border-red-200 text-center">
          {error}
          <button 
            onClick={() => window.location.reload()} 
            className="block mx-auto mt-2 text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={weddingTasks} 
            onTaskClick={handleEditClick} 
            prioritySort={dashboardPrioritySort}
            onPrioritySortChange={setDashboardPrioritySort}
          />
        );
      case 'list':
        return (
          <TaskList 
            tasks={weddingTasks} 
            availableCategories={weddingCategories}
            onEdit={handleEditClick} 
            onDelete={confirmDeleteTask}
            onStatusChange={handleStatusChange}
            filters={filters}
            setFilters={setFilters}
          />
        );
      case 'gantt':
        return <GanttChart tasks={weddingTasks} onTaskClick={handleEditClick} />;
      case 'timeline':
        return <TimelineView tasks={weddingTasks} onEdit={handleEditClick} onStatusChange={handleStatusChange} />;
      case 'todo':
        return (
          <TodoView 
            tasks={tasks}
            onSave={handleSaveTask}
            onStatusChange={handleStatusChange}
            onEdit={handleEditClick}
          />
        );
      default:
        return (
          <Dashboard 
            tasks={weddingTasks} 
            onTaskClick={handleEditClick}
            prioritySort={dashboardPrioritySort}
            onPrioritySortChange={setDashboardPrioritySort}
          />
        );
    }
  };

  return (
    <Layout>
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {isSaving && <LoadingOverlay message="Processing changes..." />}

      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={executeDeleteTask} 
        title="Delete Task" 
        message="Are you sure you want to delete this task? This action cannot be undone." 
      />

      {/* Optimized Layout: Utility Bar separated from Navigation Tabs */}
      <div className="flex flex-col space-y-6 mb-10">
        {/* Row 1: Utility Actions (Import, Export, Add Task) */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <CsvManager tasks={tasks} onImport={handleImport} isImporting={isSaving} />
          <button
            onClick={handleAddNew}
            disabled={isLoading}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Row 2: Navigation Tabs */}
        <div className="flex items-center justify-start">
          <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm overflow-x-auto max-w-full no-scrollbar">
            {(['dashboard', 'list', 'gantt', 'timeline', 'todo'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap flex items-center gap-2 ${
                  view === mode 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {mode === 'todo' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    To-Do List
                  </>
                ) : mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[500px]">
        {renderView()}
      </div>

      <TaskForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        onDelete={confirmDeleteTask}
        initialData={editingTask}
        existingTasks={tasks}
        allTasks={tasks}
      />
    </Layout>
  );
};

export default App;
