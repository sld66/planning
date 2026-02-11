
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_STAFF_NAMES, ShiftStatus, DEFAULT_MISSION_TYPES, MissionType, CellData } from './types';
import { getDaysInMonth, getMonthName } from './utils';
import ScheduleGrid from './components/ScheduleGrid';
import MonthSelector from './components/MonthSelector';
import Legend from './components/Legend';
import { 
  Printer, RefreshCw, ChevronLeft, ChevronRight, Lock, Unlock, Eye, X, 
  Trash2, Users, BarChart3, Settings2, Plus, Download, Upload, Save, 
  Cloud, CloudUpload, CloudDownload, Link, CheckCircle2, AlertCircle, Palette
} from 'lucide-react';

// ==========================================
// CONFIGURATION CACHÉE
// REMPLACEZ L'URL CI-DESSOUS PAR VOTRE URL GOOGLE APPS SCRIPT RÉELLE
// ==========================================
const CLOUD_DATABASE_URL = "https://script.google.com/macros/s/AKfycbwV4N_VOTRE_URL_REELLE_ICI/exec";
const ADMIN_PASSWORD = "270478";

const PRESET_COLORS = [
  { bg: 'bg-white', text: 'text-gray-800' },
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
  { bg: 'bg-lime-500', text: 'text-black' },
  { bg: 'bg-yellow-300', text: 'text-black' },
  { bg: 'bg-green-300', text: 'text-black' },
  { bg: 'bg-blue-300', text: 'text-black' },
  { bg: 'bg-stone-400', text: 'text-white' },
  { bg: 'bg-orange-400', text: 'text-white' },
  { bg: 'bg-slate-200', text: 'text-slate-700' },
];

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
  
  // New Mission States
  const [newMissionCode, setNewMissionCode] = useState("");
  const [newMissionLabel, setNewMissionLabel] = useState("");
  const [newMissionColor, setNewMissionColor] = useState(PRESET_COLORS[0]);

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
    return localStorage.getItem('google_script_url') || CLOUD_DATABASE_URL;
  });

  // Persistance Locale
  useEffect(() => localStorage.setItem('app_role', isAdmin ? 'admin' : 'user'), [isAdmin]);
  useEffect(() => localStorage.setItem('schedule_data', JSON.stringify(scheduleData)), [scheduleData]);
  useEffect(() => localStorage.setItem('staff_names', JSON.stringify(staffNames)), [staffNames]);
  useEffect(() => localStorage.setItem('mission_types', JSON.stringify(missionTypes)), [missionTypes]);
  useEffect(() => localStorage.setItem('google_script_url', googleScriptUrl), [googleScriptUrl]);

  // SYNCHRONISATION AUTOMATIQUE AU DÉMARRAGE
  useEffect(() => {
    if (googleScriptUrl && !googleScriptUrl.includes("VOTRE_URL_REELLE_ICI")) {
      pullFromCloud(true); 
    }
  }, [googleScriptUrl]);

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

  const handleAddMission = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newMissionCode.trim().toUpperCase();
    if (!code) return;
    if (missionTypes.some(m => m.code === code)) {
      alert("Ce code existe déjà.");
      return;
    }
    const newMission: MissionType = {
      code,
      label: newMissionLabel.trim() || code,
      bg: newMissionColor.bg,
      text: newMissionColor.text,
      isSystem: false
    };
    setMissionTypes([...missionTypes, newMission]);
    setNewMissionCode("");
    setNewMissionLabel("");
  };

  const handleDeleteMission = (code: string) => {
    if (code === '') return; // Ne pas supprimer le vide
    if (confirm(`Supprimer la mission ${code} ? Les données existantes dans le planning resteront mais n'auront plus de couleur.`)) {
      setMissionTypes(missionTypes.filter(m => m.code !== code));
    }
  };

  // Google Sheets API Logic
  const pushToCloud = async () => {
    if (!googleScriptUrl || googleScriptUrl.includes("VOTRE_URL_REELLE_ICI")) {
      return alert("Erreur : L'URL du Cloud n'est pas configurée correctement dans le code.");
    }
    setIsSyncing(true);
    try {
      const payload = { staffNames, missionTypes, scheduleData, lastSync: new Date().toISOString() };
      await fetch(googleScriptUrl, { 
        method: 'POST', 
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      setCloudStatus('success');
      alert("Données synchronisées avec succès !");
    } catch (error) {
      setCloudStatus('error');
      alert("Erreur de connexion au Cloud. Vérifiez les permissions du script Google.");
    } finally {
      setIsSyncing(false);
    }
  };

  const pullFromCloud = async (silent = false) => {
    if (!googleScriptUrl || googleScriptUrl.includes("VOTRE_URL_REELLE_ICI")) return;
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(googleScriptUrl);
      if (!response.ok) throw new Error("Réponse réseau non OK");
      const json = await response.json();
      if (json && json.scheduleData) {
        if (silent || confirm("Nouvelles données trouvées sur le Cloud. Mettre à jour votre affichage ?")) {
          if (json.staffNames) setStaffNames(json.staffNames);
          if (json.missionTypes) setMissionTypes(json.missionTypes);
          if (json.scheduleData) setScheduleData(json.scheduleData);
          setCloudStatus('success');
        }
      }
    } catch (error) {
      console.error("Erreur Cloud:", error);
      setCloudStatus('error');
      if (!silent) {
        alert("Impossible de récupérer les données. Assurez-vous que le script Google est déployé avec l'accès 'Tous' (Anyone).");
      }
    } finally {
      if (!silent) setIsSyncing(false);
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
          <div className={`p-2 rounded-lg transition-all ${isAdmin ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-400'} shadow-lg`}>
            <Cloud className={`text-white w-6 h-6 ${isSyncing ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none flex items-center gap-2">
              Planning Service
              <div className="flex gap-1">
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isAdmin ? 'Admin' : 'Lecture'}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black flex items-center gap-1 ${cloudStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                  {cloudStatus === 'success' ? 'Connecté' : 'Erreur Cloud'}
                </span>
              </div>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <>
              <button onClick={() => setIsCloudModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                <Cloud size={18} />
                <span className="hidden lg:inline font-bold">Base Cloud</span>
              </button>
              <button onClick={() => setIsDataModalOpen(true)} className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"><Save size={18} /></button>
              <button onClick={() => setIsMissionsModalOpen(true)} className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"><Settings2 size={18} /></button>
              <button onClick={() => setIsSummaryModalOpen(true)} className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"><BarChart3 size={18} /></button>
              <button onClick={() => setIsStaffModalOpen(true)} className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100"><Users size={18} /></button>
            </>
          )}

          <button onClick={handleAdminToggle} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isAdmin ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}>
            {isAdmin ? <Lock size={18} /> : <Unlock size={18} />}
            <span>{isAdmin ? "Quitter Admin" : "Mode Admin"}</span>
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
            <div className="flex gap-2">
              <button 
                onClick={() => pullFromCloud(false)} 
                className="text-[10px] bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-full font-black flex items-center gap-2 hover:bg-blue-50 shadow-sm transition-all active:scale-95"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/> ACTUALISER
              </button>
              {isAdmin && (
                <button 
                  onClick={pushToCloud} 
                  className="text-[10px] bg-indigo-600 text-white px-4 py-2 rounded-full font-black flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                >
                  <CloudUpload size={14}/> PUBLIER LE PLANNING
                </button>
              )}
            </div>
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
                <h3 className="text-xl font-bold">Synchronisation Cloud</h3>
              </div>
              <button onClick={() => setIsCloudModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block">Lien de la base de données</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={googleScriptUrl} 
                    onChange={(e) => setGoogleScriptUrl(e.target.value)} 
                    placeholder="URL Google Apps Script..."
                    className="flex-1 px-4 py-3 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 bg-white font-mono"
                  />
                  <div className={`p-3 rounded-xl border bg-white ${cloudStatus === 'success' ? 'text-emerald-500 border-emerald-200' : 'text-red-400 border-red-200'}`}>
                    {cloudStatus === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={pushToCloud} className="flex flex-col items-center p-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 group">
                  <CloudUpload size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                  <span className="font-black text-xs uppercase">Envoyer</span>
                </button>
                <button onClick={() => pullFromCloud(false)} className="flex flex-col items-center p-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 group">
                  <CloudDownload size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                  <span className="font-black text-xs uppercase">Récupérer</span>
                </button>
              </div>
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
                <h3 className="text-xl font-bold text-indigo-900">Bilan Cumulé {currentYear}</h3>
              </div>
              <button onClick={() => setIsSummaryModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead className="bg-gray-100 border-b sticky top-0 z-10">
                  <tr>
                    <th className="p-3 font-bold border">Agent</th>
                    {missionTypes.filter(m => m.code !== '').map(m => (
                      <th key={m.code} className="p-3 text-center font-bold border">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-4 h-2 rounded ${m.bg} border`}></div>
                          {m.code}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-center font-bold border-l-2 bg-indigo-100 text-indigo-900 uppercase">Service</th>
                  </tr>
                </thead>
                <tbody className="divide-y border">
                  {personSummaries.map((s) => (
                    <tr key={s.name} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-3 font-bold border bg-gray-50/50 uppercase">{s.name}</td>
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
          </div>
        </div>
      )}

      {/* MODAL MISSIONS AVEC CRÉATION/SUPPRESSION */}
      {isMissionsModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-amber-600">
                <Settings2 size={24}/>
                <h3 className="text-xl font-bold">Gestion des Missions</h3>
              </div>
              <button onClick={() => setIsMissionsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            {/* Formulaire d'ajout */}
            <form onSubmit={handleAddMission} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Code (Max 4)</label>
                  <input 
                    maxLength={4}
                    type="text" 
                    value={newMissionCode} 
                    onChange={(e) => setNewMissionCode(e.target.value)} 
                    placeholder="Ex: FORM" 
                    className="w-full px-3 py-2 border rounded-lg font-black uppercase text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Libellé</label>
                  <input 
                    type="text" 
                    value={newMissionLabel} 
                    onChange={(e) => setNewMissionLabel(e.target.value)} 
                    placeholder="Formation" 
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Couleur d'affichage</label>
                <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg border">
                  {PRESET_COLORS.map((c, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => setNewMissionColor(c)}
                      className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${c.bg} ${newMissionColor.bg === c.bg ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-200'}`}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-amber-600 text-white py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-amber-700 shadow-md">
                <Plus size={16}/> Ajouter la mission
              </button>
            </form>

            <div className="max-h-60 overflow-auto pr-1 space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Missions Actuelles</h4>
              {missionTypes.filter(m => m.code !== '').map(m => (
                <div key={m.code} className="flex items-center justify-between p-3 bg-white border rounded-xl hover:border-indigo-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-8 rounded-lg border shadow-sm ${m.bg} flex items-center justify-center text-[10px] font-black uppercase ${m.text}`}>{m.code}</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{m.label}</span>
                      {m.isSystem && <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">Système</span>}
                    </div>
                  </div>
                  {!m.isSystem && (
                    <button 
                      onClick={() => handleDeleteMission(m.code)}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Autres Modals (Password, Personnel, Data) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-6 text-center">Accès Administration</h3>
            <form onSubmit={verifyPassword} className="space-y-4">
              <input autoFocus type="password" value={passwordInput} onChange={(e) => {setPasswordInput(e.target.value); setPasswordError(false);}} placeholder="••••••" className={`w-full px-4 py-3 bg-gray-50 border ${passwordError ? 'border-red-500 animate-shake' : 'border-gray-200'} rounded-xl focus:outline-none text-center text-2xl tracking-[0.5em]`} />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest">Déverrouiller</button>
            </form>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Users size={24}/>
                <h3 className="text-xl font-bold">Gestion du Personnel</h3>
              </div>
              <button onClick={() => setIsStaffModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const n = newStaffName.trim().toUpperCase(); if(n && !staffNames.includes(n)) { setStaffNames([...staffNames, n]); setNewStaffName(""); } }} className="flex gap-2 mb-6">
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="NOUVEL AGENT..." className="flex-1 px-4 py-3 bg-gray-50 border rounded-xl font-bold uppercase placeholder:normal-case focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all"><Plus/></button>
            </form>
            <div className="max-h-60 overflow-auto space-y-2 pr-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Liste des Agents</h4>
              {staffNames.map(name => (
                <div key={name} className="flex justify-between items-center p-3 bg-white border rounded-xl group hover:border-indigo-200 hover:bg-indigo-50/10 transition-all">
                  <span className="font-black text-xs uppercase tracking-wider">{name}</span>
                  <button onClick={() => setStaffNames(staffNames.filter(s => s !== name))} className="text-slate-300 hover:text-red-600 transition-colors p-1"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
               <button onClick={() => setIsStaffModalOpen(false)} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase hover:text-slate-600 transition-colors">Fermer la fenêtre</button>
            </div>
          </div>
        </div>
      )}

      {isDataModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="p-4 bg-amber-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Download className="text-amber-600" size={40}/>
            </div>
            <h3 className="text-xl font-bold mb-2">Sauvegarde Manuelle</h3>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify({staffNames, missionTypes, scheduleData}, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `planning_backup_${currentYear}.json`; a.click();
            }} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">
              <Download size={20}/> Télécharger JSON
            </button>
            <button onClick={() => setIsDataModalOpen(false)} className="mt-6 text-slate-400 text-[10px] font-bold uppercase hover:text-slate-600">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
