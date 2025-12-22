import { SRData } from '../types';

// SuperMemo 2 Algorithm implementation
export const calculateNewSRS = (
  currentSrs: SRData,
  quality: number // 0-5
): SRData => {
  let { interval, repetition, efactor } = currentSrs;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const now = new Date();
  const dueDate = now.setDate(now.getDate() + interval);

  return {
    interval,
    repetition,
    efactor,
    dueDate,
  };
};

export const initialSRS: SRData = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
  dueDate: Date.now(),
};