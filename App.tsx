import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { GanttChart } from './components/GanttChart';
import { TimelineView } from './components/TimelineView';
import { CsvManager } from './components/CsvManager';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Task, ViewMode, FilterState, TaskStatus, TaskCategory } from './types';
import { taskService } from './services/api';

// Simple Notification Component Inline
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
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // UI State
  const [view, setView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  
  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    status: [], 
    dateRange: { start: '', end: '' }
  });

  // Derived State: Dynamic list of categories from existing tasks + Standard Enums
  const availableCategories = useMemo(() => {
    const standardCategories = Object.values(TaskCategory) as string[];
    const usedCategories = tasks.map(t => t.category);
    const unique = new Set([...standardCategories, ...usedCategories]);
    return Array.from(unique).sort();
  }, [tasks]);

  // Initial Fetch
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

  // Handlers
  const handleSaveTask = async (task: Task) => {
    try {
      setIsSaving(true);
      const isNew = !tasks.some(t => t.id === task.id);
      
      // Call API
      const savedTask = await taskService.saveTask(task, isNew);
      
      // Update Local State
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

    // Optimistic Update
    const updatedTask = { ...task, status: newStatus };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    try {
      await taskService.saveTask(updatedTask, false);
      showNotification(`Task marked as ${newStatus}`, 'success');
    } catch (err) {
      console.error(err);
      // Revert on failure
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
      setIsConfirmOpen(false); // Close modal immediately
      setIsSaving(true);
      
      await taskService.deleteTask(taskToDeleteId);
      
      setTasks(prev => prev.filter(t => t.id !== taskToDeleteId));
      setIsModalOpen(false); // Also close edit modal if it was open
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
      
      // Map to store Old ID -> New UUID mapping
      const idMap = new Map<string, string>();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // 1. First pass: Sanitize IDs
      const tasksWithValidIds = newTasks.map(t => {
        const isUUID = uuidRegex.test(t.id);
        const isDuplicate = tasks.some(existing => existing.id === t.id);
        
        if (!isUUID || isDuplicate) {
          const newId = crypto.randomUUID();
          idMap.set(t.id, newId);
          return { ...t, id: newId };
        }
        return t;
      });

      // 2. Second pass: Update dependencies to point to the new IDs
      const finalTasks = tasksWithValidIds.map(t => ({
        ...t,
        dependencies: t.dependencies
          .map(depId => idMap.get(depId) || depId) 
          .filter(depId => tasksWithValidIds.some(valid => valid.id === depId) || tasks.some(existing => existing.id === depId)) 
      }));
      
      // 3. Sync to Backend
      const syncedTasks = await taskService.syncTasks(finalTasks);
      
      // Update state
      setTasks(syncedTasks);
      showNotification(`Successfully imported ${newTasks.length} tasks`, 'success');
      
    } catch (err: any) {
      console.error("Import failed:", err);
      showNotification(err.message || "Failed to import tasks", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // View Components Map
  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mb-4"></div>
           <p>Loading your wedding plan...</p>
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
        return <Dashboard tasks={tasks} />;
      case 'list':
        return (
          <TaskList 
            tasks={tasks} 
            availableCategories={availableCategories}
            onEdit={handleEditClick} 
            onDelete={confirmDeleteTask}
            onStatusChange={handleStatusChange}
            filters={filters}
            setFilters={setFilters}
          />
        );
      case 'gantt':
        return <GanttChart tasks={tasks} onTaskClick={handleEditClick} />;
      case 'timeline':
        return <TimelineView tasks={tasks} onEdit={handleEditClick} onStatusChange={handleStatusChange} />;
      default:
        return <Dashboard tasks={tasks} />;
    }
  };

  return (
    <Layout>
      {/* Toast Notification */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Global Loading Overlay (Optional, used for big ops) */}
      {isSaving && <LoadingOverlay message="Saving changes..." />}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={executeDeleteTask} 
        title="Delete Task" 
        message="Are you sure you want to delete this task? This action cannot be undone." 
      />

      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        
        {/* View Switcher */}
        <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm">
          {(['dashboard', 'list', 'gantt', 'timeline'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                view === mode 
                  ? 'bg-primary-100 text-primary-800' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <CsvManager tasks={tasks} onImport={handleImport} isImporting={isSaving} />
          
          <button
            onClick={handleAddNew}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {renderView()}
      </div>

      {/* Modal */}
      <TaskForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        onDelete={confirmDeleteTask}
        initialData={editingTask}
        existingTasks={tasks}
        availableCategories={availableCategories}
      />
    </Layout>
  );
};

export default App;