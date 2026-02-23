
import React, { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNew?: boolean;
  onAddNew?: () => void;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  allowNew = false,
  onAddNew,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus-within:border-primary-500 focus-within:ring-primary-500 sm:text-sm border p-2 bg-white cursor-pointer flex justify-between items-center"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="sticky top-0 z-10 bg-white px-2 py-1">
            <input
              type="text"
              className="w-full border-gray-200 rounded-md text-sm p-1.5 focus:border-primary-500 focus:ring-primary-500"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="pt-1">
            {filteredOptions.length === 0 && !allowNew && (
              <div className="px-4 py-2 text-sm text-gray-500 italic">No results found</div>
            )}
            
            {filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 hover:text-primary-900 transition-colors ${
                  value === option ? "bg-primary-100 text-primary-900 font-semibold" : "text-gray-900"
                }`}
              >
                {option}
              </div>
            ))}

            {allowNew && onAddNew && (
              <div
                onClick={() => {
                  onAddNew();
                  setIsOpen(false);
                  setSearch("");
                }}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 text-primary-600 font-bold hover:bg-primary-50 border-t border-gray-50 mt-1"
              >
                + Create New Category
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
