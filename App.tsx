
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_STAFF_NAMES, ShiftStatus, DEFAULT_MISSION_TYPES, MissionType, CellData } from './types';
import { getDaysInMonth, getMonthName } from './utils';
import ScheduleGrid from './components/ScheduleGrid';
import MonthSelector from './components/MonthSelector';
import Legend from './components/Legend';
import { 
  Printer, RefreshCw, ChevronLeft, ChevronRight, Lock, Unlock, Eye, X, 
  Trash2, Users, BarChart3, Settings2, Plus, Download, Upload, Save, 
  Cloud, CloudUpload, CloudDownload, Link, CheckCircle2, AlertCircle 
} from 'lucide-react';

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
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => {
    return localStorage.getItem('google_script_url') || "";
  });

  // Persistance Locale
  useEffect(() => localStorage.setItem('app_role', isAdmin ? 'admin' : 'user'), [isAdmin]);
  useEffect(() => localStorage.setItem('schedule_data', JSON.stringify(scheduleData)), [scheduleData]);
  useEffect(() => localStorage.setItem('staff_names', JSON.stringify(staffNames)), [staffNames]);
  useEffect(() => localStorage.setItem('mission_types', JSON.stringify(missionTypes)), [missionTypes]);
  useEffect(() => localStorage.setItem('google_script_url', googleScriptUrl), [googleScriptUrl]);

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
        [yearKey]: { ...newYearData, [monthKey]: { ...newMonthData, cells: { ...(newMonthData.cells || {}), [name]: { ...newPersonData, [day]: { status, comment } } } } }
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
        [yearKey]: { ...newYearData, [monthKey]: { ...newMonthData, dayNotes: { ...(newMonthData.dayNotes || {}), [day]: note } } }
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

  const handleAdminToggle = () => {
    if (isAdmin) { setIsAdmin(false); } 
    else { setPasswordInput(""); setPasswordError(false); setIsPasswordModalOpen(true); }
  };

  const verifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setIsPasswordModalOpen(false); } 
    else { setPasswordError(true); }
  };

  // Google Sheets API Logic
  const testCloudConnection = async () => {
    if (!googleScriptUrl) return;
    setIsSyncing(true);
    setCloudStatus('idle');
    try {
      const response = await fetch(googleScriptUrl);
      if (response.ok) setCloudStatus('success');
      else setCloudStatus('error');
    } catch (e) {
      setCloudStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const pushToCloud = async () => {
    if (!googleScriptUrl) return alert("Configurez d'abord l'URL Cloud.");
    setIsSyncing(true);
    try {
      const payload = { staffNames, missionTypes, scheduleData, lastSync: new Date().toISOString() };
      await fetch(googleScriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      setCloudStatus('success');
      alert("Données sauvegardées sur Google Sheets !");
    } catch (error) {
      setCloudStatus('error');
      alert("Erreur lors de l'envoi.");
    } finally {
      setIsSyncing(false);
    }
  };

  const pullFromCloud = async () => {
    if (!googleScriptUrl) return alert("Configurez d'abord l'URL Cloud.");
    setIsSyncing(true);
    try {
      const response = await fetch(googleScriptUrl);
      const json = await response.json();
      if (json.staffNames && json.missionTypes && json.scheduleData) {
        if (confirm("Charger les données du Cloud ? Cela écrasera vos modifications locales.")) {
          setStaffNames(json.staffNames);
          setMissionTypes(json.missionTypes);
          setScheduleData(json.scheduleData);
          setCloudStatus('success');
        }
      } else {
        alert("Données cloud invalides.");
      }
    } catch (error) {
      setCloudStatus('error');
      alert("Erreur de récupération.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Calcul Récapitulatif Annuel
  const personSummaries = useMemo(() => {
    const yearKey = currentYear.toString();
    const yearData = scheduleData[yearKey] || {};
    return staffNames.map(name => {
      const summary: any = { name, total: 0 };
      missionTypes.forEach(m => { if(m.code) summary[m.code] = 0; });
      for (let m = 0; m < 12; m++) {
        const monthKey = m.toString();
        const monthCells = yearData[monthKey]?.cells?.[name] || {};
        const days = getDaysInMonth(currentYear, m);
        days.forEach(d => {
          const cell = monthCells[d.date];
          const status = typeof cell === 'object' ? cell.status : cell;
          if (status && summary.hasOwnProperty(status)) summary[status]++;
          if (status && status !== 'ABS' && status !== '') summary.total++;
        });
      }
      return summary;
    });
  }, [currentYear, staffNames, scheduleData, missionTypes]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg transition-colors ${isAdmin ? 'bg-indigo-600' : 'bg-slate-400'}`}>
            <RefreshCw className={`text-white w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none flex items-center gap-2">
              Planning Service
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                {isAdmin ? 'Admin' : 'Lecture'}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <>
              <button onClick={() => setIsCloudModalOpen(true)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors font-medium ${googleScriptUrl ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400'}`}>
                <Cloud size={18} />
                <span className="hidden lg:inline">Cloud Sheet</span>
              </button>
              <button onClick={() => setIsDataModalOpen(true)} className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"><Save size={18} /></button>
              <button onClick={() => setIsMissionsModalOpen(true)} className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"><Settings2 size={18} /></button>
              <button onClick={() => setIsSummaryModalOpen(true)} className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"><BarChart3 size={18} /></button>
              <button onClick={() => setIsStaffModalOpen(true)} className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"><Users size={18} /></button>
            </>
          )}

          <button onClick={handleAdminToggle} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isAdmin ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}>
            {isAdmin ? <Lock size={18} /> : <Unlock size={18} />}
            <span>{isAdmin ? "Admin" : "Mode Admin"}</span>
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-1 mx-2">
             <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-white rounded transition-all"><ChevronLeft size={16} /></button>
             <span className="px-3 font-bold text-gray-700 text-sm">{currentYear}</span>
             <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-white rounded transition-all"><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => window.print()} className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"><Printer size={18} /></button>
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
            {googleScriptUrl && <button onClick={pullFromCloud} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-blue-700 shadow-sm"><RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''}/> Rafraîchir Cloud</button>}
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

      {/* MODAL CLOUD CONFIG */}
      {isCloudModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Cloud className="text-blue-600" size={24}/>
                <h3 className="text-xl font-bold">Base de données Google Sheet</h3>
              </div>
              <button onClick={() => setIsCloudModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <label className="text-xs text-blue-600 font-bold uppercase mb-2 block">URL Google Apps Script</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={googleScriptUrl} 
                    onChange={(e) => { setGoogleScriptUrl(e.target.value); setCloudStatus('idle'); }} 
                    placeholder="https://script.google.com/macros/s/..."
                    className="flex-1 px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  />
                  <button 
                    onClick={testCloudConnection}
                    className={`p-2 rounded-xl transition-all ${cloudStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-white border text-blue-600 hover:bg-blue-50'}`}
                  >
                    {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : cloudStatus === 'success' ? <CheckCircle2 size={18}/> : cloudStatus === 'error' ? <AlertCircle size={18}/> : <Link size={18}/>}
                  </button>
                </div>
                {cloudStatus === 'success' && <p className="text-[10px] text-emerald-600 font-bold mt-2">Connexion établie avec succès !</p>}
                {cloudStatus === 'error' && <p className="text-[10px] text-red-500 font-bold mt-2">Échec de la connexion. Vérifiez l'URL.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={pushToCloud} 
                  className="flex flex-col items-center p-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 group"
                >
                  <CloudUpload size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                  <span className="font-bold text-sm">ENVOYER</span>
                  <span className="text-[10px] opacity-70">Enregistrer vers Cloud</span>
                </button>
                <button 
                  onClick={pullFromCloud} 
                  className="flex flex-col items-center p-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 group"
                >
                  <CloudDownload size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                  <span className="font-bold text-sm">RÉCUPÉRER</span>
                  <span className="text-[10px] opacity-70">Charger depuis Cloud</span>
                </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Comment ça marche ?</h5>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Une fois configurée, cette URL permet à tous les PC d'utiliser la même base de données. 
                Utilisez "RÉCUPÉRER" au démarrage pour avoir les dernières données, et "ENVOYER" après chaque modification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉCAPITULATIF ANNUEL */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
              <div>
                <h3 className="text-xl font-bold text-indigo-900">Statistiques Annuelles - {currentYear}</h3>
                <p className="text-xs text-indigo-600">Total cumulé de Janvier à Décembre</p>
              </div>
              <button onClick={() => setIsSummaryModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 border-b sticky top-0 z-10">
                  <tr>
                    <th className="p-3 font-bold border">Personnel</th>
                    {missionTypes.filter(m => m.code !== '').map(m => (
                      <th key={m.code} className="p-3 text-center font-bold border">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-4 h-2 rounded ${m.bg} border`}></div>
                          {m.code}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-center font-bold border-l-2 bg-indigo-100 text-indigo-900">CUMUL SERVICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y border">
                  {personSummaries.map((s) => (
                    <tr key={s.name} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-3 font-bold border bg-gray-50/50">{s.name}</td>
                      {missionTypes.filter(m => m.code !== '').map(m => (
                        <td key={m.code} className={`p-3 text-center border font-medium ${s[m.code] > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                          {s[m.code] || '-'}
                        </td>
                      ))}
                      <td className="p-3 text-center font-black text-indigo-700 border-l-2 bg-indigo-50">
                        {s.total || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => window.print()} className="px-6 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-100">
                <Printer size={16}/> Imprimer le bilan annuel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals de support (Password, Personnel, Missions, Data) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-6">Accès Admin</h3>
            <form onSubmit={verifyPassword} className="space-y-4">
              <input autoFocus type="password" value={passwordInput} onChange={(e) => {setPasswordInput(e.target.value); setPasswordError(false);}} placeholder="Code secret" className={`w-full px-4 py-3 bg-gray-50 border ${passwordError ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:outline-none text-center text-2xl tracking-[0.5em]`} />
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Déverrouiller</button>
            </form>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-6">Gestion Personnel</h3>
            <form onSubmit={(e) => { e.preventDefault(); const n = newStaffName.trim().toUpperCase(); if(n && !staffNames.includes(n)) { setStaffNames([...staffNames, n]); setNewStaffName(""); } }} className="flex gap-2 mb-6">
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="NOM" className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl font-bold" />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl"><Plus/></button>
            </form>
            <div className="max-h-60 overflow-auto space-y-2">
              {staffNames.map(name => (
                <div key={name} className="flex justify-between p-3 bg-gray-50 rounded-xl border">
                  <span className="font-bold">{name}</span>
                  <button onClick={() => setStaffNames(staffNames.filter(s => s !== name))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isMissionsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-6">Configuration Missions</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {missionTypes.map(m => (
                <div key={m.code} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-6 rounded border ${m.bg} flex items-center justify-center text-[10px] font-bold`}>{m.code}</div>
                    <span className="text-xs font-medium">{m.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDataModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-6">Sauvegarde Locale</h3>
            <div className="grid gap-4">
              <button onClick={() => {
                const blob = new Blob([JSON.stringify({staffNames, missionTypes, scheduleData}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `backup_${currentYear}.json`; a.click();
              }} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold"><Download size={18}/> Exporter Fichier</button>
            </div>
            <button onClick={() => setIsDataModalOpen(false)} className="mt-6 w-full text-center text-gray-400 text-sm">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
