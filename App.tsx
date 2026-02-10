
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_STAFF_NAMES, ShiftStatus, DEFAULT_MISSION_TYPES, MissionType, CellData } from './types';
import { getDaysInMonth, getMonthName } from './utils';
import ScheduleGrid from './components/ScheduleGrid';
import MonthSelector from './components/MonthSelector';
import Legend from './components/Legend';
import { Printer, RefreshCw, ChevronLeft, ChevronRight, Lock, Unlock, Eye, X, UserPlus, Trash2, Users, BarChart3, Settings2, Plus, MessageSquare } from 'lucide-react';

const ADMIN_PASSWORD = "270478";

const App: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const savedRole = localStorage.getItem('app_role');
    return savedRole === 'admin';
  });
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
  
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");

  const [staffNames, setStaffNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('staff_names');
    return saved ? JSON.parse(saved) : DEFAULT_STAFF_NAMES;
  });

  const [missionTypes, setMissionTypes] = useState<MissionType[]>(() => {
    const saved = localStorage.getItem('mission_types');
    return saved ? JSON.parse(saved) : DEFAULT_MISSION_TYPES;
  });

  const [scheduleData, setScheduleData] = useState<any>(() => {
    const saved = localStorage.getItem('schedule_data');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist items
  useEffect(() => localStorage.setItem('app_role', isAdmin ? 'admin' : 'user'), [isAdmin]);
  useEffect(() => localStorage.setItem('schedule_data', JSON.stringify(scheduleData)), [scheduleData]);
  useEffect(() => localStorage.setItem('staff_names', JSON.stringify(staffNames)), [staffNames]);
  useEffect(() => localStorage.setItem('mission_types', JSON.stringify(missionTypes)), [missionTypes]);

  const handleUpdateCell = useCallback((name: string, day: number, status: string, comment?: string) => {
    if (!isAdmin) return;
    setScheduleData((prev: any) => {
      const yearKey = currentYear.toString();
      const monthKey = currentMonth.toString();
      
      const newYearData = prev[yearKey] || {};
      const newMonthData = newYearData[monthKey] || {};
      const newPersonData = newMonthData.cells?.[name] || {};

      return {
        ...prev,
        [yearKey]: {
          ...newYearData,
          [monthKey]: {
            ...newMonthData,
            cells: {
              ...(newMonthData.cells || {}),
              [name]: {
                ...newPersonData,
                [day]: { status, comment }
              }
            }
          }
        }
      };
    });
  }, [currentYear, currentMonth, isAdmin]);

  const handleUpdateDayNote = useCallback((day: number, note: string) => {
    if (!isAdmin) return;
    setScheduleData((prev: any) => {
      const yearKey = currentYear.toString();
      const monthKey = currentMonth.toString();
      const newYearData = prev[yearKey] || {};
      const newMonthData = newYearData[monthKey] || {};
      
      return {
        ...prev,
        [yearKey]: {
          ...newYearData,
          [monthKey]: {
            ...newMonthData,
            dayNotes: {
              ...(newMonthData.dayNotes || {}),
              [day]: note
            }
          }
        }
      };
    });
  }, [currentYear, currentMonth, isAdmin]);

  const handleBulkUpdate = useCallback((updates: { name: string; day: number; status: string }[]) => {
    if (!isAdmin) return;
    setScheduleData((prev: any) => {
      const yearKey = currentYear.toString();
      const monthKey = currentMonth.toString();
      
      const nextState = { ...prev };
      if (!nextState[yearKey]) nextState[yearKey] = {};
      if (!nextState[yearKey][monthKey]) nextState[yearKey][monthKey] = {};
      if (!nextState[yearKey][monthKey].cells) nextState[yearKey][monthKey].cells = {};

      updates.forEach(({ name, day, status }) => {
        if (!nextState[yearKey][monthKey].cells[name]) nextState[yearKey][monthKey].cells[name] = {};
        const currentData = nextState[yearKey][monthKey].cells[name][day];
        const comment = typeof currentData === 'object' ? (currentData as any).comment : undefined;
        nextState[yearKey][monthKey].cells[name][day] = { status, comment };
      });

      return nextState;
    });
  }, [currentYear, currentMonth, isAdmin]);

  const clearData = () => {
    if (!isAdmin) return;
    if (confirm("Effacer tout le planning pour cette année ?")) {
      setScheduleData((prev: any) => ({ ...prev, [currentYear]: {} }));
    }
  };

  const handleAdminToggle = () => {
    if (isAdmin) { setIsAdmin(false); } 
    else { setPasswordInput(""); setPasswordError(false); setIsPasswordModalOpen(true); }
  };

  const verifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setIsPasswordModalOpen(false); } 
    else { setPasswordError(true); }
  };

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStaffName.trim().toUpperCase();
    if (name && !staffNames.includes(name)) { setStaffNames([...staffNames, name]); setNewStaffName(""); }
  };

  // Fix: Added removeStaff function to handle staff deletion from the list.
  const removeStaff = (name: string) => {
    if (window.confirm(`Supprimer ${name} du personnel ?`)) {
      setStaffNames(staffNames.filter(s => s !== name));
    }
  };

  const addMission = (code: string, label: string, bg: string) => {
    const upperCode = code.trim().toUpperCase();
    if (upperCode && !missionTypes.find(m => m.code === upperCode)) {
      setMissionTypes([...missionTypes, { code: upperCode, label, bg, text: 'text-black' }]);
    }
  };

  const deleteMission = (code: string) => {
    const mission = missionTypes.find(m => m.code === code);
    if (mission?.isSystem) return alert("Impossible de supprimer une mission système.");
    setMissionTypes(missionTypes.filter(m => m.code !== code));
  };

  const personSummaries = useMemo(() => {
    const days = getDaysInMonth(currentYear, currentMonth);
    const data = scheduleData[currentYear]?.[currentMonth]?.cells || {};
    
    return staffNames.map(name => {
      const summary: any = { name, total: 0 };
      missionTypes.forEach(m => { if(m.code) summary[m.code] = 0; });
      
      days.forEach(d => {
        const cell = data[name]?.[d.date];
        const status = typeof cell === 'object' ? cell.status : cell;
        if (status && summary.hasOwnProperty(status)) {
          summary[status]++;
        }
        if (status && status !== 'ABS' && status !== '') {
          summary.total++;
        }
      });
      return summary;
    });
  }, [currentYear, currentMonth, staffNames, scheduleData, missionTypes]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg transition-colors ${isAdmin ? 'bg-indigo-600' : 'bg-slate-400'}`}>
            <RefreshCw className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none flex items-center gap-2">
              Gestionnaire d'Emploi du Temps
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                {isAdmin ? 'Admin' : 'Lecture'}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <>
              <button onClick={() => setIsMissionsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                <Settings2 size={18} />
                <span className="hidden lg:inline">Missions</span>
              </button>
              <button onClick={() => setIsSummaryModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
                <BarChart3 size={18} />
                <span className="hidden lg:inline">Récapitulatif</span>
              </button>
              <button onClick={() => setIsStaffModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                <Users size={18} />
                <span className="hidden lg:inline">Personnel</span>
              </button>
            </>
          )}

          <button onClick={handleAdminToggle} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isAdmin ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}>
            {isAdmin ? <Lock size={18} /> : <Unlock size={18} />}
            <span>{isAdmin ? "Quitter Admin" : "Mode Admin"}</span>
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-1 mx-2">
             <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-white rounded transition-all"><ChevronLeft size={16} /></button>
             <span className="px-3 font-bold text-gray-700 text-sm">{currentYear}</span>
             <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-white rounded transition-all"><ChevronRight size={16} /></button>
          </div>
          
          <button onClick={() => window.print()} className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"><Printer size={18} /></button>
          {isAdmin && <button onClick={clearData} className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100"><RefreshCw size={18} /></button>}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-2/3"><MonthSelector currentMonth={currentMonth} onSelect={setCurrentMonth} /></div>
          <div className="w-full lg:w-1/3"><Legend missionTypes={missionTypes} /></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between no-print">
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">{getMonthName(currentMonth)} {currentYear}</h2>
            {isAdmin ? <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">ADMIN : Glissez pour remplir / Clic-droit pour commentaire / Cliquez entête pour note du jour</div> : <div className="text-[10px] text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded flex items-center gap-2"><Eye size={14} /> Consultation</div>}
          </div>
          
          <ScheduleGrid 
            year={currentYear} month={currentMonth} isAdmin={isAdmin} staffNames={staffNames} missionTypes={missionTypes}
            data={scheduleData[currentYear]?.[currentMonth]?.cells || {}}
            dayNotes={scheduleData[currentYear]?.[currentMonth]?.dayNotes || {}}
            onUpdateCell={handleUpdateCell}
            onBulkUpdate={handleBulkUpdate}
            onUpdateDayNote={handleUpdateDayNote}
          />
        </div>
      </main>

      {/* Admin Modals */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Accès Admin</h3><button onClick={() => setIsPasswordModalOpen(false)}><X size={20} className="text-gray-400" /></button></div>
            <form onSubmit={verifyPassword} className="space-y-4">
              <input autoFocus type="password" value={passwordInput} onChange={(e) => {setPasswordInput(e.target.value); setPasswordError(false);}} placeholder="Code secret" className={`w-full px-4 py-3 bg-gray-50 border ${passwordError ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:outline-none text-center text-2xl tracking-[0.5em]`} />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Déverrouiller</button>
            </form>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Gérer le Personnel</h3><button onClick={() => setIsStaffModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={addStaff} className="flex gap-2 mb-6">
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="NOM" className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl uppercase font-bold" />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Ajouter</button>
            </form>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {staffNames.map(name => (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <span className="font-bold">{name}</span>
                  <button onClick={() => removeStaff(name)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isMissionsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Gérer les Missions</h3><button onClick={() => setIsMissionsModalOpen(false)}><X size={20} /></button></div>
            <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-700 uppercase mb-3">Nouvelle Mission</h4>
              <div className="flex flex-col gap-2">
                <input id="m_code" type="text" placeholder="Code (ex: FOO)" className="px-3 py-2 border rounded-lg text-sm uppercase font-bold" />
                <input id="m_label" type="text" placeholder="Libellé complet" className="px-3 py-2 border rounded-lg text-sm" />
                <div className="flex gap-2">
                  <select id="m_color" className="flex-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="bg-pink-300">Rose</option>
                    <option value="bg-cyan-300">Cyan</option>
                    <option value="bg-purple-300">Violet</option>
                    <option value="bg-lime-300">Lime</option>
                    <option value="bg-yellow-100">Jaune clair</option>
                    <option value="bg-teal-300">Teal</option>
                  </select>
                  <button onClick={() => {
                    const c = (document.getElementById('m_code') as HTMLInputElement).value;
                    const l = (document.getElementById('m_label') as HTMLInputElement).value;
                    const b = (document.getElementById('m_color') as HTMLSelectElement).value;
                    if(c && l) { addMission(c, l, b); (document.getElementById('m_code') as HTMLInputElement).value = ""; (document.getElementById('m_label') as HTMLInputElement).value = ""; }
                  }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"><Plus size={16}/> Créer</button>
                </div>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {missionTypes.map(m => (
                <div key={m.code} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-6 rounded border ${m.bg} flex items-center justify-center text-[10px] font-bold`}>{m.code}</div>
                    <div className="text-xs font-medium">{m.label}</div>
                  </div>
                  {!m.isSystem && <button onClick={() => deleteMission(m.code)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <div><h3 className="text-xl font-bold">Récapitulatif - {getMonthName(currentMonth)}</h3></div>
              <button onClick={() => setIsSummaryModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="p-2 font-bold">Personnel</th>
                    {missionTypes.filter(m => m.code !== '').map(m => (
                      <th key={m.code} className="p-2 text-center font-bold">{m.code}</th>
                    ))}
                    <th className="p-2 text-center font-bold border-l bg-indigo-50/30">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {personSummaries.map((s) => (
                    <tr key={s.name} className="hover:bg-gray-50">
                      <td className="p-2 font-bold">{s.name}</td>
                      {missionTypes.filter(m => m.code !== '').map(m => (
                        <td key={m.code} className="p-2 text-center">{s[m.code] || '-'}</td>
                      ))}
                      <td className="p-2 text-center font-bold text-indigo-700 border-l bg-indigo-50/30">{s.total || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block p-8 text-center border-b mb-8">
        <h1 className="text-3xl font-bold">{getMonthName(currentMonth)} {currentYear}</h1>
        <p className="text-gray-600">Planning de Service</p>
      </div>
    </div>
  );
};

export default App;
