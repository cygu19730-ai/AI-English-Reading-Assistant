export type StudyRecord = {
  totalArticles: number;
  totalWords: number;
  totalExercisesCompleted: number;
  totalExercisesCorrect: number;
  totalReviews: number;
  lastStudyDate: string | null;
};

export type ArticleStatus = 'completed' | 'reviewing';

export type ArticleHistory = {
  id: string;
  title: string;
  date: string;
  wordCount: number;
  difficulty: string;
  status: ArticleStatus;
};

const STUDY_KEY = 'studyLog';
const HISTORY_KEY = 'articleHistory';
const MAX_HISTORY = 20;

const EMPTY_RECORD: StudyRecord = {
  totalArticles: 0,
  totalWords: 0,
  totalExercisesCompleted: 0,
  totalExercisesCorrect: 0,
  totalReviews: 0,
  lastStudyDate: null,
};

function nowIso(): string {
  return new Date().toISOString();
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable in private browsing or storage-restricted contexts.
  }
}

function normalizeHistory(history: ArticleHistory[]): ArticleHistory[] {
  return history.map((item) => ({
    ...item,
    id: item.id || `${item.date}-${item.title}`,
    status: item.status === 'reviewing' ? 'reviewing' : 'completed',
  }));
}

export function getStudyLog(): StudyRecord {
  const stored = readStorage<Partial<StudyRecord>>(STUDY_KEY, EMPTY_RECORD);
  return {
    totalArticles: Number(stored.totalArticles) || 0,
    totalWords: Number(stored.totalWords) || 0,
    totalExercisesCompleted: Number(stored.totalExercisesCompleted) || 0,
    totalExercisesCorrect: Number(stored.totalExercisesCorrect) || 0,
    totalReviews: Number(stored.totalReviews) || 0,
    lastStudyDate: stored.lastStudyDate || null,
  };
}

export function getArticleHistory(): ArticleHistory[] {
  const stored = readStorage<ArticleHistory[]>(HISTORY_KEY, []);
  if (!Array.isArray(stored)) return [];
  return normalizeHistory(stored);
}

export function recordArticleRead(
  wordCount: number,
  title = '外刊精读',
  difficulty = '待评级'
): ArticleHistory {
  const log = getStudyLog();
  log.totalArticles += 1;
  log.totalWords += Math.max(0, Number(wordCount) || 0);
  log.lastStudyDate = nowIso();
  writeStorage(STUDY_KEY, log);

  const entry: ArticleHistory = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || '外刊精读',
    date: nowIso(),
    wordCount: Math.max(0, Number(wordCount) || 0),
    difficulty: difficulty || '待评级',
    status: 'completed',
  };

  const history = getArticleHistory();
  history.unshift(entry);
  writeStorage(HISTORY_KEY, history.slice(0, MAX_HISTORY));

  return entry;
}

export function updateLatestArticleDifficulty(difficulty: string): void {
  if (!difficulty) return;

  const history = getArticleHistory();
  if (history.length === 0) return;

  history[0] = {
    ...history[0],
    difficulty,
  };
  writeStorage(HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

export function recordExerciseResult(isCorrect: boolean): void {
  const log = getStudyLog();
  log.totalExercisesCompleted += 1;
  if (isCorrect) log.totalExercisesCorrect += 1;
  log.lastStudyDate = nowIso();
  writeStorage(STUDY_KEY, log);
}

export function recordReview(): void {
  const log = getStudyLog();
  log.totalReviews += 1;
  log.lastStudyDate = nowIso();
  writeStorage(STUDY_KEY, log);

  const history = getArticleHistory();
  if (history.length === 0) return;

  history[0] = {
    ...history[0],
    status: 'reviewing',
  };
  writeStorage(HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

export function getCorrectRate(): number {
  const log = getStudyLog();
  if (log.totalExercisesCompleted === 0) return 0;
  return Math.round(
    (log.totalExercisesCorrect / log.totalExercisesCompleted) * 100
  );
}

