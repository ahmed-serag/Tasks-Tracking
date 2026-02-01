
import React, { useRef, useState, useEffect } from 'react';
import { Task, TaskCategory, TaskStatus } from '../types';
import { tasksToCSV, parseCSVToTasks, downloadCSV } from '../utils/helpers';

interface CsvManagerProps {
  tasks: Task[];
  onImport: (newTasks: Task[]) => void;
  isImporting: boolean;
}

export const CsvManager: React.FC<CsvManagerProps> = ({ tasks, onImport, isImporting }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localStatus, setLocalStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

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
    const template = "ID,Task Name,Category,Start Date,End Date,Status,Initial Cost,Actual Cost,Dependencies,Notes,Important\n" +
                     ",Sample Task,Venue,2024-01-01,2024-02-01,Not Started,1000,0,,This is a sample,Yes";
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onerror = () => {
      setLocalStatus('error');
      setStatusMsg('Error reading file');
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2 items-center relative">
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
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
        
        {statusMsg && (
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
        onClick={() => setShowGuide(true)}
        className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
        title="Import Guide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-bold text-gray-900">Google Sheets Import Guide</h2>
                <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>
              
              <div className="space-y-4 text-sm text-gray-600">
                <section>
                  <h3 className="font-bold text-gray-900 mb-2">1. Header Requirements</h3>
                  <p>Your spreadsheet MUST have these exact headers in the first row:</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100 font-mono text-xs mt-2 overflow-x-auto">
                    ID, Task Name, Category, Start Date, End Date, Status, Initial Cost, Actual Cost, Dependencies, Notes, Important
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-gray-900 mb-2">2. Supported Categories</h3>
                  <p>Use any of these (capitalization doesn't matter):</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.values(TaskCategory).map(cat => (
                      <span key={cat} className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs border border-primary-100">{cat}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="font-bold text-gray-900 mb-2">3. Date Format</h3>
                  <p>Dates should be in <span className="font-mono">YYYY-MM-DD</span> format for the best results (e.g., 2024-05-20).</p>
                </section>

                <section>
                  <h3 className="font-bold text-gray-900 mb-2">4. Exporting from Google Sheets</h3>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Go to your Google Sheet.</li>
                    <li>Click <strong>File</strong> > <strong>Download</strong> > <strong>Comma Separated Values (.csv)</strong>.</li>
                    <li>Click "Import CSV" here and select that file.</li>
                  </ol>
                </section>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={handleTemplate}
                  className="px-4 py-2 border border-primary-200 text-primary-600 rounded-md hover:bg-primary-50 text-sm font-medium"
                >
                  Download Template
                </button>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
