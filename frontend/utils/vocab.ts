export type VocabWord = {
  word: string;
  phonetic: string;
  meaning: string;
  synonym: string;
  uncommon_meaning?: string;
  dateAdded: string;
};

const STORAGE_KEY = 'vocabList';

export function getVocabList(): VocabWord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VocabWord[]) : [];
  } catch {
    return [];
  }
}

export function addVocabWord(word: VocabWord): void {
  const list = getVocabList();
  if (list.some((item) => item.word === word.word)) return;
  list.push({
    ...word,
    dateAdded: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeVocabWord(word: string): void {
  const list = getVocabList().filter((item) => item.word !== word);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isWordSaved(word: string): boolean {
  return getVocabList().some((item) => item.word === word);
}