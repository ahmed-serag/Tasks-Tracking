
import React, { useState, useEffect } from 'react';
import { Task, TaskCategory, TaskStatus } from '../types';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  initialData?: Task;
  existingTasks: Task[]; // For dependency selection
  availableCategories: string[];
}

export const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSave, onDelete, initialData, existingTasks, availableCategories }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    category: TaskCategory.OTHER,
    startDate: '',
    endDate: '',
    status: TaskStatus.NOT_STARTED,
    initialCost: 0,
    actualCost: 0,
    dependencies: [],
    notes: '',
    important: false
  });

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsNewCategory(false);
      setNewCategoryName('');
      
      if (initialData) {
        // Explicitly ensure date strings are YYYY-MM-DD
        const extractDate = (d: string) => {
          if (!d) return '';
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return '';
          return dateObj.toISOString().split('T')[0];
        };

        setFormData({
          ...initialData,
          startDate: extractDate(initialData.startDate),
          endDate: extractDate(initialData.endDate)
        });
      } else {
        // Reset for new task - Dates start empty
        setFormData({
          id: crypto.randomUUID(),
          name: '',
          category: TaskCategory.OTHER,
          startDate: '', 
          endDate: '',
          status: TaskStatus.NOT_STARTED,
          initialCost: 0,
          actualCost: 0,
          dependencies: [],
          notes: '',
          important: false
        });
      }
      setError('');
    }
  }, [initialData, isOpen]);

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__NEW__') {
      setIsNewCategory(true);
      setNewCategoryName('');
    } else {
      setIsNewCategory(false);
      handleChange('category', value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Task name is required");
      return;
    }
    
    // Handle new category
    if (isNewCategory) {
      if (!newCategoryName.trim()) {
        setError("Please enter a name for the new category");
        return;
      }
      formData.category = newCategoryName.trim();
    }

    // Simple Circular Dependency Check
    if (formData.dependencies && formData.dependencies.length > 0 && formData.id) {
       if (formData.dependencies.includes(formData.id)) {
         setError("A task cannot depend on itself");
         return;
       }
    }

    onSave(formData as Task);
    onClose();
  };

  const handleDelete = () => {
    if (initialData?.id) {
      onDelete(initialData.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg leading-6 font-serif font-bold text-gray-900" id="modal-title">
                {initialData ? 'Edit Task' : 'Add New Task'}
              </h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</div>}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Task Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Visit Wedding Venue"
                required
              />
            </div>
            
             {/* Important Flag */}
            <div className="flex items-center">
              <input
                id="important"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.important || false}
                onChange={(e) => handleChange('important', e.target.checked)}
              />
              <label htmlFor="important" className="ml-2 block text-sm text-gray-900 font-medium">
                Mark as Important ⭐
              </label>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                {!isNewCategory ? (
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    value={formData.category || TaskCategory.OTHER}
                    onChange={handleCategoryChange}
                  >
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option disabled>──────────</option>
                    <option value="__NEW__" className="text-primary-600 font-bold">+ Create New Category</option>
                  </select>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      placeholder="Enter new category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsNewCategory(false)}
                      className="text-gray-400 hover:text-gray-600 px-2"
                      title="Cancel custom category"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={formData.status || TaskStatus.NOT_STARTED}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {Object.values(TaskStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={formData.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* Costs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={formData.initialCost ?? 0}
                  onChange={(e) => handleChange('initialCost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Actual Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={formData.actualCost ?? 0}
                  onChange={(e) => handleChange('actualCost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Depends On</label>
              <select
                multiple
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 h-24"
                value={formData.dependencies || []}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                  handleChange('dependencies', options);
                }}
              >
                {existingTasks
                  .filter(t => t.id !== formData.id) // Cannot depend on self
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 italic">Hold Ctrl (Cmd) to select multiple tasks.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any specific details or reminders..."
              />
            </div>

            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm transition-colors"
              >
                {initialData ? 'Update Task' : 'Create Task'}
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              {initialData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm sm:mr-auto sm:w-auto transition-colors"
                >
                  Delete Task
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
