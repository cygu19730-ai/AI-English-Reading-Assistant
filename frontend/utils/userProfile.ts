// frontend/utils/userProfile.ts

export type ExamType = 'kaoyan' | 'cet6' | 'ielts' | 'toefl';
export type Level = 'basic' | 'intermediate' | 'advanced';

export type UserProfile = {
  examType: ExamType;
  level: Level;
  targetScore: string;
  createdAt: string;
};

const PROFILE_KEY = 'userProfile';

const EXAM_LABELS: Record<ExamType, string> = {
  kaoyan: '考研英语',
  cet6: 'CET-6',
  ielts: 'IELTS',
  toefl: 'TOEFL',
};

const LEVEL_LABELS: Record<Level, string> = {
  basic: '基础',
  intermediate: '中等',
  advanced: '较强',
};

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
      // localStorage can be unavailable in private browsing or storage-restricted contexts.
    }
  },
};

// ========== 核心功能 ==========
export function getUserProfile(): UserProfile | null {
  try {
    const raw = safeLocalStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      examType: parsed.examType || 'kaoyan',
      level: parsed.level || 'intermediate',
      targetScore: parsed.targetScore || '',
      createdAt: parsed.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  safeLocalStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearUserProfile(): void {
  safeLocalStorage.setItem(PROFILE_KEY, '');
}

export function getProfileLabel(): string {
  const profile = getUserProfile();
  if (!profile) return '未设置';
  return `${EXAM_LABELS[profile.examType]} · ${LEVEL_LABELS[profile.level]}`;
}

// ========== 辅助函数 ==========
export function getExamLabel(examType: ExamType): string {
  return EXAM_LABELS[examType] || examType;
}

export function getLevelLabel(level: Level): string {
  return LEVEL_LABELS[level] || level;
}

export function hasUserProfile(): boolean {
  return getUserProfile() !== null;
}