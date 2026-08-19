// frontend/utils/vocab.ts

export type VocabWord = {
  word: string;
  phonetic: string;
  meaning: string;
  synonym: string;
  uncommon_meaning?: string;
  dateAdded: string;
  // === Spaced Repetition 字段 ===
  reviewCount: number;      // 总复习次数
  correctCount: number;     // 正确次数
  wrongCount: number;       // 错误次数
  lastReviewed: string | null;  // 上次复习时间 ISO
  nextReview: string | null;    // 下次复习时间 ISO
  mastery: number;          // 掌握度 0-5
};

const STORAGE_KEY = 'vocabList';

// 间隔表（天）
const INTERVALS = [1, 3, 7, 14, 30];

// ========== 安全 localStorage 工具 ==========
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// ========== 初始化：只在客户端执行清理 ==========
// ⚠️ 移除顶层执行，改为函数调用
export function clearVocabList(): void {
  safeLocalStorage.removeItem(STORAGE_KEY);
}

// ========== 核心 CRUD ==========
export function getVocabList(): VocabWord[] {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VocabWord[]) : [];
  } catch {
    return [];
  }
}

export function addVocabWord(
  word: Omit<VocabWord, 'reviewCount' | 'correctCount' | 'wrongCount' | 'lastReviewed' | 'nextReview' | 'mastery'> & {
    reviewCount?: number;
    correctCount?: number;
    wrongCount?: number;
    lastReviewed?: string | null;
    nextReview?: string | null;
    mastery?: number;
  }
): void {
  const list = getVocabList();
  if (list.some((item) => item.word === word.word)) return;
  list.push({
    ...word,
    reviewCount: word.reviewCount ?? 0,
    correctCount: word.correctCount ?? 0,
    wrongCount: word.wrongCount ?? 0,
    lastReviewed: word.lastReviewed ?? null,
    nextReview: word.nextReview ?? null,
    mastery: word.mastery ?? 0,
    dateAdded: word.dateAdded || new Date().toISOString(),
  });
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeVocabWord(word: string): void {
  const list = getVocabList().filter((item) => item.word !== word);
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isWordSaved(word: string): boolean {
  return getVocabList().some((item) => item.word === word);
}

// === Spaced Repetition 核心函数 ===

export function calculateNextReview(
  currentMastery: number,
  isCorrect: boolean
): { nextReview: string; mastery: number } {
  // 正确：mastery + 1（上限 5）；错误：mastery 重置为 0
  const newMastery = isCorrect ? Math.min(currentMastery + 1, 5) : 0;
  const intervalDays = INTERVALS[Math.min(newMastery, INTERVALS.length - 1)];
  const nextReview = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  return { nextReview, mastery: newMastery };
}

export function reviewWord(word: string, isCorrect: boolean): void {
  const list = getVocabList();
  const index = list.findIndex((item) => item.word === word);
  if (index === -1) return;

  const item = list[index];
  const { nextReview, mastery } = calculateNextReview(item.mastery, isCorrect);

  list[index] = {
    ...item,
    reviewCount: item.reviewCount + 1,
    correctCount: item.correctCount + (isCorrect ? 1 : 0),
    wrongCount: item.wrongCount + (isCorrect ? 0 : 1),
    lastReviewed: new Date().toISOString(),
    nextReview,
    mastery,
  };

  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDueWords(): VocabWord[] {
  const now = Date.now();
  return getVocabList().filter((item) => {
    if (!item.nextReview) return false;
    return new Date(item.nextReview).getTime() <= now;
  });
}

export function getMasteryLabel(mastery: number): string {
  const labels = ['未复习', '初级', '进行中', '较熟练', '熟练', '已掌握'];
  return labels[Math.min(mastery, 5)] ?? '未复习';
}

// ========== 批量操作 ==========
export function addVocabWordsFromList(words: Array<Omit<VocabWord, 'reviewCount' | 'correctCount' | 'wrongCount' | 'lastReviewed' | 'nextReview' | 'mastery'>>): void {
  const list = getVocabList();
  const existingWords = new Set(list.map(item => item.word));
  
  const newWords = words
    .filter(w => !existingWords.has(w.word))
    .map(w => ({
      ...w,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      lastReviewed: null,
      nextReview: null,
      mastery: 0,
      dateAdded: w.dateAdded || new Date().toISOString(),
    }));
  
  if (newWords.length > 0) {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify([...list, ...newWords]));
  }
}

export function getVocabStats(): { total: number; mastered: number; toReview: number } {
  const list = getVocabList();
  const mastered = list.filter(item => item.mastery >= 4).length;
  return {
    total: list.length,
    mastered,
    toReview: list.length - mastered,
  };
}