import React, { useRef, useState, useEffect } from 'react';
import { Task } from '../types';
import { tasksToCSV, parseCSVToTasks, downloadCSV } from '../utils/helpers';

interface CsvManagerProps {
  tasks: Task[];
  onImport: (newTasks: Task[]) => void;
  isImporting: boolean; // Received from parent to show loading state
}

export const CsvManager: React.FC<CsvManagerProps> = ({ tasks, onImport, isImporting }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localStatus, setLocalStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // Reset status after a few seconds of success/error
  useEffect(() => {
    if (localStatus === 'success' || localStatus === 'error') {
      const timer = setTimeout(() => {
        setLocalStatus('idle');
        setStatusMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [localStatus]);

  const handleExport = () => {
    try {
      const csv = tasksToCSV(tasks);
      downloadCSV(csv, `blissplan-tasks-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (e) {
      console.error(e);
      setLocalStatus('error');
      setStatusMsg('Export failed');
    }
  };

  const handleTemplate = () => {
    const template = "ID,Task Name,Category,Start Date,End Date,Status,Initial Cost,Actual Cost,Dependencies,Notes\n" +
                     ",Sample Task,Venue,2024-01-01,2024-02-01,Not Started,1000,0,,This is a sample";
    downloadCSV(template, 'task-import-template.csv');
  };

  const handleImportClick = () => {
    if (isImporting) return;
    setLocalStatus('idle');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalStatus('parsing');
    setStatusMsg('Reading file...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const importedTasks = parseCSVToTasks(content);
          if (importedTasks.length > 0) {
            // Success parsing, now passing to parent
            // We don't set 'success' here yet, parent handles the async sync
            // But for UI feedback we can say "Importing..."
            onImport(importedTasks);
          } else {
            setLocalStatus('error');
            setStatusMsg('No valid tasks found');
          }
        } catch (error) {
          setLocalStatus('error');
          setStatusMsg('Invalid CSV format');
          console.error(error);
        }
      } else {
        setLocalStatus('error');
        setStatusMsg('Empty file');
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      setLocalStatus('error');
      setStatusMsg('Error reading file');
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2 items-center">
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      {/* Import Button with Status */}
      <div className="relative flex items-center">
        <button 
          onClick={handleImportClick}
          disabled={isImporting || localStatus === 'parsing'}
          className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none transition-all
            ${localStatus === 'error' ? 'border-red-300 bg-red-50 text-red-700' : 
              localStatus === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
              'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
        >
          {isImporting || localStatus === 'parsing' ? (
             <>
               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {localStatus === 'parsing' ? 'Parsing...' : 'Importing...'}
             </>
          ) : (
            <>
               <svg className="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
               </svg>
               Import CSV
            </>
          )}
        </button>
        
        {/* Floating Status Message */}
        {(localStatus === 'error' || localStatus === 'success' || statusMsg) && (
            <div className={`absolute left-0 -bottom-8 whitespace-nowrap text-xs font-medium px-2 py-1 rounded shadow-sm z-10
              ${localStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-800 text-white'}`}>
              {statusMsg}
            </div>
        )}
      </div>

      <button 
        onClick={handleExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
      >
        <svg className="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
       <button 
        onClick={handleTemplate}
        className="text-xs text-primary-500 underline ml-1 hover:text-primary-700"
        title="Download CSV Template"
      >
        Template
      </button>
    </div>
  );
};