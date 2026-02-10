
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MissionType, CellData } from '../types';
import { getDaysInMonth } from '../utils';
import { MessageSquare, Info, X } from 'lucide-react';

interface ScheduleGridProps {
  year: number;
  month: number;
  data: any;
  dayNotes: any;
  isAdmin: boolean;
  staffNames: string[];
  missionTypes: MissionType[];
  onUpdateCell: (name: string, day: number, status: string, comment?: string) => void;
  onBulkUpdate: (updates: { name: string; day: number; status: string }[]) => void;
  onUpdateDayNote: (day: number, note: string) => void;
}

interface SelectionPoint {
  staffIndex: number;
  dayIndex: number;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ 
  year, month, data, dayNotes, isAdmin, staffNames, missionTypes, onUpdateCell, onBulkUpdate, onUpdateDayNote 
}) => {
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const [activeMenu, setActiveMenu] = useState<SelectionPoint[] | null>(null);
  const [selectionStart, setSelectionStart] = useState<SelectionPoint | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectionPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Comment Editor state
  const [commentingCell, setCommentingCell] = useState<{name: string, day: number, current: string} | null>(null);
  const [editingDayNote, setEditingDayNote] = useState<{day: number, current: string} | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const getSelectionRange = (start: SelectionPoint, end: SelectionPoint): SelectionPoint[] => {
    const minS = Math.min(start.staffIndex, end.staffIndex), maxS = Math.max(start.staffIndex, end.staffIndex);
    const minD = Math.min(start.dayIndex, end.dayIndex), maxD = Math.max(start.dayIndex, end.dayIndex);
    const range: SelectionPoint[] = [];
    for (let s = minS; s <= maxS; s++) for (let d = minD; d <= maxD; d++) range.push({ staffIndex: s, dayIndex: d });
    return range;
  };

  const isCellSelected = (si: number, di: number) => {
    if (isDragging && selectionStart && selectionEnd) {
      const minS = Math.min(selectionStart.staffIndex, selectionEnd.staffIndex), maxS = Math.max(selectionStart.staffIndex, selectionEnd.staffIndex);
      const minD = Math.min(selectionStart.dayIndex, selectionEnd.dayIndex), maxD = Math.max(selectionStart.dayIndex, selectionEnd.dayIndex);
      return si >= minS && si <= maxS && di >= minD && di <= maxD;
    }
    return activeMenu?.some(p => p.staffIndex === si && p.dayIndex === di) || false;
  };

  const selectStatus = (status: string) => {
    if (activeMenu && isAdmin) {
      onBulkUpdate(activeMenu.map(p => ({ name: staffNames[p.staffIndex], day: days[p.dayIndex].date, status })));
      setActiveMenu(null);
    }
  };

  const calculateTotalDay = (day: number) => {
    let count = 0;
    staffNames.forEach(name => {
      const cell = data[name]?.[day];
      const status = typeof cell === 'object' ? cell.status : cell;
      if (status && status !== 'ABS' && status !== '') count++;
    });
    return count;
  };

  const getCellInfo = (name: string, day: number): CellData => {
    const cell = data[name]?.[day];
    if (typeof cell === 'object') return cell;
    return { status: cell || '' };
  };

  return (
    <div className={`overflow-x-auto relative ${!isAdmin ? 'cursor-default' : ''}`}>
      <table className="w-full border-collapse text-[10px] sm:text-xs">
        <thead className="bg-gray-100 sticky top-0 z-20">
          <tr>
            <th className="border border-gray-300 p-1 w-32 min-w-[100px] bg-gray-200 sticky left-0 z-20 text-left">NOM / DATE</th>
            {days.map((d) => (
              <th 
                key={`name-${d.date}`} 
                onClick={() => isAdmin && setEditingDayNote({day: d.date, current: dayNotes[d.date] || ''})}
                className={`border border-gray-300 p-1 min-w-[35px] font-bold cursor-pointer group hover:bg-white transition-colors ${d.isWeekend ? 'bg-red-50 text-red-600' : 'text-gray-600'}`}
              >
                <div className="relative">
                  {d.dayName}
                  {dayNotes[d.date] && <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                  <div className="hidden group-hover:block absolute top-full left-0 bg-black text-white p-2 z-50 text-[8px] min-w-[100px] font-normal rounded shadow-lg">
                    {dayNotes[d.date] || "Pas de note du jour (Cliquez pour éditer)"}
                  </div>
                </div>
              </th>
            ))}
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 p-1 sticky left-0 z-20 bg-gray-100 text-left font-normal text-gray-500">Personnel</th>
            {days.map((d) => (
              <th key={`date-${d.date}`} className={`border border-gray-300 p-1 min-w-[30px] font-bold ${d.isWeekend ? 'bg-red-100/50' : ''}`}>{d.date}</th>
            ))}
          </tr>
        </thead>
        <tbody onMouseUp={() => { if (isDragging && selectionStart && selectionEnd) setActiveMenu(getSelectionRange(selectionStart, selectionEnd)); setIsDragging(false); }}>
          {staffNames.map((name, sIdx) => (
            <tr key={name} className="hover:bg-slate-50">
              <td className="border border-gray-300 p-1.5 font-bold text-gray-700 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{name}</td>
              {days.map((d, dIdx) => {
                const cell = getCellInfo(name, d.date);
                const config = missionTypes.find(m => m.code === cell.status) || missionTypes[missionTypes.length - 1];
                const selected = isCellSelected(sIdx, dIdx);
                return (
                  <td
                    key={`${name}-${d.date}`}
                    onMouseDown={() => { if(isAdmin) { setSelectionStart({ staffIndex: sIdx, dayIndex: dIdx }); setSelectionEnd({ staffIndex: sIdx, dayIndex: dIdx }); setIsDragging(true); setActiveMenu(null); } }}
                    onMouseEnter={() => { if(isDragging) setSelectionEnd({ staffIndex: sIdx, dayIndex: dIdx }); }}
                    onContextMenu={(e) => { e.preventDefault(); if(isAdmin) setCommentingCell({name, day: d.date, current: cell.comment || ''}); }}
                    className={`border border-gray-300 p-0 text-center h-8 relative ${d.isWeekend ? 'bg-slate-50' : ''} ${config.bg} ${config.text} ${selected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-100' : ''} transition-all cursor-pointer group`}
                  >
                    <span className="font-bold">{cell.status}</span>
                    {cell.comment && <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-indigo-600 border-l-[6px] border-l-transparent"></div>}
                    {cell.comment && (
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white p-2 rounded text-[9px] min-w-[80px] z-50 shadow-xl mb-1">
                        {cell.comment}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-gray-300 p-1.5 bg-gray-200 sticky left-0 z-10">NB/P/J</td>
            {days.map((d) => <td key={`total-${d.date}`} className={`border border-gray-300 p-1 text-center bg-green-50 text-green-700`}>{calculateTotalDay(d.date) || ''}</td>)}
          </tr>
        </tbody>
      </table>

      {activeMenu && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div ref={menuRef} className="bg-white rounded-xl shadow-2xl border p-4 w-72 animate-in zoom-in duration-150">
            <div className="mb-3 flex justify-between items-center"><h4 className="text-xs font-bold uppercase">Missions ({activeMenu.length})</h4><button onClick={() => setActiveMenu(null)}><X size={14}/></button></div>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-auto pr-1">
              {missionTypes.map((m) => (
                <button key={m.code} onClick={() => selectStatus(m.code)} className={`flex flex-col items-center justify-center py-2 rounded border text-[10px] hover:scale-105 active:scale-95 transition-all ${m.bg} ${m.text}`}>
                  <span className="font-bold">{m.code || 'X'}</span>
                  <span className="opacity-60 text-[8px] truncate max-w-full px-1">{m.label}</span>
                </button>
              ))}
            </div>
            {activeMenu.length === 1 && (
              <button onClick={() => { 
                const p = activeMenu[0]; 
                const name = staffNames[p.staffIndex], day = days[p.dayIndex].date;
                setCommentingCell({name, day, current: getCellInfo(name, day).comment || ''});
                setActiveMenu(null);
              }} className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
                <MessageSquare size={12}/> Ajouter un commentaire
              </button>
            )}
          </div>
        </div>
      )}

      {commentingCell && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><MessageSquare size={16}/> Commentaire pour {commentingCell.name} le {commentingCell.day}</h3>
            <textarea autoFocus value={commentingCell.current} onChange={(e) => setCommentingCell({...commentingCell, current: e.target.value})} className="w-full h-32 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Saisir un commentaire..."></textarea>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCommentingCell(null)} className="flex-1 py-2 text-gray-500 font-bold border rounded-lg text-xs">Annuler</button>
              <button onClick={() => { onUpdateCell(commentingCell.name, commentingCell.day, getCellInfo(commentingCell.name, commentingCell.day).status, commentingCell.current); setCommentingCell(null); }} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {editingDayNote && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Info size={16}/> Note du jour - {editingDayNote.day}/{month+1}</h3>
            <textarea autoFocus value={editingDayNote.current} onChange={(e) => setEditingDayNote({...editingDayNote, current: e.target.value})} className="w-full h-24 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Évènement spécial, vacances, note globale..."></textarea>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingDayNote(null)} className="flex-1 py-2 text-gray-500 font-bold border rounded-lg text-xs">Annuler</button>
              <button onClick={() => { onUpdateDayNote(editingDayNote.day, editingDayNote.current); setEditingDayNote(null); }} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleGrid;
