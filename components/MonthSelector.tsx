
import React from 'react';
import { getMonthName } from '../utils';

interface MonthSelectorProps {
  currentMonth: number;
  onSelect: (index: number) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ currentMonth, onSelect }) => {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1 no-print">
      {months.map((month) => (
        <button
          key={month}
          onClick={() => onSelect(month)}
          className={`
            py-2 px-1 text-[10px] font-bold rounded-md transition-all border
            ${currentMonth === month 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
              : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
            }
          `}
        >
          {getMonthName(month).substring(0, 3)}
        </button>
      ))}
    </div>
  );
};

export default MonthSelector;
