import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { TaskForm } from './components/TaskForm';
import { GanttChart } from './components/GanttChart';
import { TimelineView } from './components/TimelineView';
import { CsvManager } from './components/CsvManager';
import { Task, ViewMode, FilterState } from './types';
import { SAMPLE_TASKS } from './constants';

const App: React.FC = () => {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    status: 'All',
    dateRange: { start: '', end: '' }
  });

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('blissplan_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tasks", e);
        setTasks(SAMPLE_TASKS);
      }
    } else {
      setTasks(SAMPLE_TASKS);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (tasks.length > 0) {
       localStorage.setItem('blissplan_tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Handlers
  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } else {
      setTasks(prev => [...prev, task]);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
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

  const handleImport = (newTasks: Task[]) => {
    // Append logic: Avoid ID collisions
    const safeNewTasks = newTasks.map(t => {
      if (tasks.some(existing => existing.id === t.id)) {
        return { ...t, id: crypto.randomUUID() };
      }
      return t;
    });
    setTasks(prev => [...prev, ...safeNewTasks]);
  };

  // View Components Map
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard tasks={tasks} />;
      case 'list':
        return (
          <TaskList 
            tasks={tasks} 
            onEdit={handleEditClick} 
            onDelete={handleDeleteTask}
            filters={filters}
            setFilters={setFilters}
          />
        );
      case 'gantt':
        return <GanttChart tasks={tasks} onTaskClick={handleEditClick} />;
      case 'timeline':
        return <TimelineView tasks={tasks} onEdit={handleEditClick} />;
      default:
        return <Dashboard tasks={tasks} />;
    }
  };

  return (
    <Layout>
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
          <CsvManager tasks={tasks} onImport={handleImport} />
          
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
        initialData={editingTask}
        existingTasks={tasks}
      />
    </Layout>
  );
};

export default App;