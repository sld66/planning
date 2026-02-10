
import React from 'react';
import { MissionType } from '../types';

interface LegendProps {
  missionTypes: MissionType[];
}

const Legend: React.FC<LegendProps> = ({ missionTypes }) => {
  const items = missionTypes.filter(m => m.code !== '');

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm no-print">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Légende</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((m) => (
          <div key={m.code} className="flex items-center gap-1.5">
            <div className={`w-5 h-3 border border-gray-300 rounded ${m.bg}`}></div>
            <span className="text-[9px] font-bold text-gray-600">{m.code}: <span className="font-normal">{m.label}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legend;
