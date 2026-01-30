import React, { useRef } from 'react';
import { Task } from '../types';
import { tasksToCSV, parseCSVToTasks, downloadCSV } from '../utils/helpers';

interface CsvManagerProps {
  tasks: Task[];
  onImport: (newTasks: Task[]) => void;
}

export const CsvManager: React.FC<CsvManagerProps> = ({ tasks, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = tasksToCSV(tasks);
    downloadCSV(csv, `blissplan-tasks-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleTemplate = () => {
    const template = "ID,Task Name,Category,Start Date,End Date,Status,Initial Cost,Actual Cost,Dependencies,Notes\n" +
                     ",Sample Task,Venue,2024-01-01,2024-02-01,Not Started,1000,0,,This is a sample";
    downloadCSV(template, 'task-import-template.csv');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const importedTasks = parseCSVToTasks(content);
          if (importedTasks.length > 0) {
            const confirm = window.confirm(`Found ${importedTasks.length} tasks. This will append to your current list. Continue?`);
            if (confirm) {
              onImport(importedTasks);
            }
          } else {
            alert("No valid tasks found in file.");
          }
        } catch (error) {
          alert("Error parsing CSV. Please check the format.");
          console.error(error);
        }
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2">
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button 
        onClick={handleImportClick}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
      >
        <svg className="-ml-0.5 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Import CSV
      </button>
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
        className="text-xs text-primary-500 underline ml-2"
        title="Download CSV Template"
      >
        Template
      </button>
    </div>
  );
};