
export enum ShiftStatus {
  P = 'P',
  ABS = 'ABS',
  AST = 'AST',
  NN = 'NN',
  NS = 'NS',
  NM = 'NM',
  EPI = 'EPI',
  EMPTY = ''
}

export interface MissionType {
  code: string;
  label: string;
  bg: string;
  text: string;
  isSystem?: boolean;
}

export interface DayInfo {
  date: number;
  dayName: string;
  isWeekend: boolean;
}

export interface CellData {
  status: string;
  comment?: string;
}

export interface ScheduleEntry {
  [name: string]: {
    [day: number]: CellData | string;
  };
}

export const DEFAULT_MISSION_TYPES: MissionType[] = [
  { code: 'P', label: 'Présent', bg: 'bg-white', text: 'text-gray-800', isSystem: true },
  { code: 'ABS', label: 'Absent', bg: 'bg-red-500', text: 'text-white', isSystem: true },
  { code: 'AST', label: 'Astreinte', bg: 'bg-yellow-300', text: 'text-black', isSystem: true },
  { code: 'NN', label: 'Navette Nord', bg: 'bg-green-300', text: 'text-black', isSystem: true },
  { code: 'NS', label: 'Navette Sud', bg: 'bg-blue-300', text: 'text-black', isSystem: true },
  { code: 'NM', label: 'Navette montagne', bg: 'bg-stone-400', text: 'text-white', isSystem: true },
  { code: 'EPI', label: 'EPI', bg: 'bg-orange-400', text: 'text-white', isSystem: true },
  { code: '', label: 'Vide', bg: 'bg-slate-50', text: 'text-transparent', isSystem: true },
];

export const DEFAULT_STAFF_NAMES = [
  "NEUVILLE",
  "CARASCO",
  "SUCCI",
  "HENRY",
  "VOGEL",
  "GARCIA",
  "OLIVE",
  "BELBEZE",
  "PIOTELAT",
  "HUON"
];
