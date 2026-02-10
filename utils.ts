
import { DayInfo } from './types';

export const getDaysInMonth = (year: number, month: number): DayInfo[] => {
  const date = new Date(year, month, 1);
  const days: DayInfo[] = [];
  const frenchDays = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.'];

  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    days.push({
      date: date.getDate(),
      dayName: frenchDays[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
    'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
  ];
  return months[monthIndex];
};

export const getInitialData = (year: number) => {
  const initialData: any = {};
  for (let m = 0; m < 12; m++) {
    initialData[m] = {};
  }
  return initialData;
};
