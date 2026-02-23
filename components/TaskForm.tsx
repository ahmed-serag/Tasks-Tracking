
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskCategory, TaskStatus, TaskType } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  initialData?: Task;
  existingTasks: Task[]; // For dependency selection
  allTasks: Task[]; // To derive type-specific categories
}

export const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSave, onDelete, initialData, existingTasks, allTasks }) => {
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
    important: false,
    type: 'wedding'
  });

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string>('');

  const typeSpecificCategories = useMemo(() => {
    const currentType = formData.type || 'wedding';
    const used = allTasks
      .filter(t => (t.type || 'wedding') === currentType)
      .map(t => t.category);
    return Array.from(new Set(used.filter(c => c && c.trim() !== ''))).sort();
  }, [allTasks, formData.type]);

  useEffect(() => {
    if (isOpen) {
      setNewCategoryName('');
      
      if (initialData) {
        setIsNewCategory(false);
        const extractDate = (d: string) => {
          if (!d) return '';
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return '';
          return dateObj.toISOString().split('T')[0];
        };

        setFormData({
          ...initialData,
          type: initialData.type || 'wedding',
          startDate: extractDate(initialData.startDate),
          endDate: extractDate(initialData.endDate)
        });
      } else {
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
          important: false,
          type: 'wedding'
        });
        
        const weddingCats = allTasks.filter(t => (t.type || 'wedding') === 'wedding').length;
        setIsNewCategory(weddingCats === 0);
      }
      setError('');
    }
  }, [initialData, isOpen, allTasks]);

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'startDate' && value && !prev.endDate) {
        updated.endDate = value;
      }
      if (field === 'type' && value !== prev.type) {
        updated.category = ''; 
        setIsNewCategory(true);
      }
      return updated;
    });
  };

  const handleAddNewCategory = () => {
    setIsNewCategory(true);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Task name is required");
      return;
    }
    
    if (isNewCategory) {
      if (!newCategoryName.trim()) {
        setError("Please enter a name for the new category");
        return;
      }
      formData.category = newCategoryName.trim();
    }

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
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-serif font-bold text-gray-900" id="modal-title">
                {initialData ? 'Edit Task' : 'New Planning Task'}
              </h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100 font-medium">{error}</div>}

            {/* Type Selection - High Visibility */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Context</label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200 gap-1">
                <button 
                  type="button" 
                  onClick={() => handleChange('type', 'wedding')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${formData.type === 'wedding' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Wedding
                </button>
                <button 
                  type="button" 
                  onClick={() => handleChange('type', 'lina')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${formData.type === 'lina' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Lina's Day
                </button>
                <button 
                  type="button" 
                  onClick={() => handleChange('type', 'serag')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${formData.type === 'serag' ? 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Serag's Day
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Task Name</label>
              <input
                type="text"
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={formData.type === 'wedding' ? "e.g. Choose Bridal Bouquet" : "e.g. Pick up the flowers"}
                required
              />
            </div>
            
            {/* Important Flag */}
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input
                id="important"
                type="checkbox"
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-md"
                checked={formData.important || false}
                onChange={(e) => handleChange('important', e.target.checked)}
              />
              <label htmlFor="important" className="text-sm text-gray-900 font-bold flex items-center gap-1.5">
                Mark as Priority <span className="text-amber-500">★</span>
              </label>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                {!isNewCategory ? (
                  <SearchableSelect 
                    options={typeSpecificCategories}
                    value={formData.category || ""}
                    onChange={(val) => handleChange('category', val)}
                    allowNew={true}
                    onAddNew={handleAddNewCategory}
                    placeholder="Search..."
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3 pr-10"
                      placeholder="Enter new..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    {typeSpecificCategories.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setIsNewCategory(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3"
                  value={formData.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes & Details</label>
              <textarea
                rows={2}
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-3"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any special reminders or links..."
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-lg shadow-primary-200 px-6 py-3 bg-primary-600 text-base font-bold text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all active:scale-95 sm:text-sm"
              >
                {initialData ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-xl border border-gray-200 shadow-sm px-6 py-3 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-all sm:text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
