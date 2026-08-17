'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  addVocabWord,
  getVocabList,
  isWordSaved,
  removeVocabWord,
  type VocabWord,
} from '../../utils/vocab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface DifficultWord {
  word: string;
  phonetic: string;
  meaning: string;
  synonym: string;
}

interface UncommonUsage {
  word: string;
  common_meaning: string;
  uncommon_meaning: string;
  example: string;
}

interface LongSentence {
  sentence: string;
  analysis: string;
  translation: string;
}

interface MultipleChoice {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface TranslationExercise {
  question: string;
  answer: string;
  explanation: string;
}

interface Segment {
  original_text: string;
  difficult_words: DifficultWord[];
  uncommon_usage: UncommonUsage[];
  long_sentences: LongSentence[];
  paragraph_translation: string;
  summary: string;
  exercises: {
    multiple_choice: MultipleChoice[];
    translation: TranslationExercise[];
  };
}

interface ParseResult {
  segments: Segment[];
}

const WORD_COLORS = [
  'bg-blue-50/90 text-blue-900 border-blue-200/80 hover:bg-blue-100/60',
  'bg-indigo-50/90 text-indigo-900 border-indigo-200/80 hover:bg-indigo-100/60',
  'bg-purple-50/90 text-purple-900 border-purple-200/80 hover:bg-purple-100/60',
  'bg-sky-50/90 text-sky-900 border-sky-200/80 hover:bg-sky-100/60',
  'bg-teal-50/90 text-teal-900 border-teal-200/80 hover:bg-teal-100/60',
];

function VocabModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<VocabWord[]>([]);

  useEffect(() => {
    if (open) {
      setList(getVocabList());
    }
  }, [open]);

  if (!open) return null;

  const handleRemove = (word: string) => {
    removeVocabWord(word);
    setList(getVocabList());
  };

  const displayList = list.slice(0, 30);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <h2 className="text-base font-semibold">生词本与核心积累</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none px-1 transition-colors"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-3 bg-slate-50/50 flex-1">
          {displayList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📖</p>
              <p className="text-sm text-slate-400">暂无收藏单词，点击星号随时积累</p>
            </div>
          ) : (
            displayList.map((item) => (
              <div
                key={item.word}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-xs hover:border-indigo-300 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">{item.word}</span>
                    {item.phonetic ? (
                      <span className="text-xs text-slate-400 font-serif">{item.phonetic}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{item.meaning}</p>
                  {item.synonym ? (
                    <p className="text-xs text-slate-400 mt-1">近义：{item.synonym}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.word)}
                  className="shrink-0 px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                >
                  移除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MultipleChoiceItem({
  item,
  index,
  idPrefix,
}: {
  item: MultipleChoice;
  index: number;
  idPrefix: string;
}) {
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isCorrect =
    selected.trim().charAt(0).toUpperCase() ===
    item.answer.trim().charAt(0).toUpperCase();

  return (
    <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {index + 1}. {item.question}
        </p>
        <div className="space-y-2">
          {item.options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-2.5 text-xs md:text-sm p-2.5 rounded-lg cursor-pointer transition-all border ${
                submitted
                  ? opt.trim().charAt(0).toUpperCase() ===
                    item.answer.trim().charAt(0).toUpperCase()
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                    : selected === opt
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-slate-50 border-transparent text-slate-600 opacity-60'
                  : selected === opt
                    ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 font-medium shadow-xs'
                    : 'bg-slate-50/60 border-slate-100 text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <input
                type="radio"
                name={`${idPrefix}-mc-${index}`}
                value={opt}
                checked={selected === opt}
                disabled={submitted}
                onChange={() => setSelected(opt)}
                className="accent-indigo-600"
              />
              <span className="leading-snug">{opt}</span>
            </label>
          ))}
        </div>
        {!submitted ? (
          <Button
            size="sm"
            onClick={() => selected && setSubmitted(true)}
            disabled={!selected}
            className="w-full bg-slate-900 hover:bg-slate-800 text-xs py-1.5"
          >
            提交答案
          </Button>
        ) : (
          <div
            className={`p-3 rounded-lg text-xs leading-relaxed border ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <p className="font-semibold mb-1 flex items-center gap-1">
              {isCorrect ? '✓ 解析结论：回答正确' : '✗ 解析结论：回答错误'} · 正确答案：{item.answer}
            </p>
            <p className="text-slate-600 mt-1">{item.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TranslationItem({
  item,
  index,
}: {
  item: TranslationExercise;
  index: number;
}) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {index + 1}. {item.question}
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitted}
          placeholder="请输入你的考研精译答案..."
          className="w-full h-20 p-3 text-xs md:text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50 transition-all"
        />
        {!submitted ? (
          <Button
            size="sm"
            onClick={() => input.trim() && setSubmitted(true)}
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5"
          >
            对照精译答案
          </Button>
        ) : (
          <div className="p-3 rounded-lg text-xs bg-indigo-50/60 border border-indigo-100 text-slate-700 space-y-2">
            <div>
              <p className="font-semibold text-indigo-900 mb-0.5">参考标准译文：</p>
              <p className="text-slate-800 leading-relaxed font-medium">{item.answer}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 mb-0.5">你的译文：</p>
              <p className="text-slate-600">{input}</p>
            </div>
            {item.explanation ? (
              <div className="pt-1 border-t border-indigo-100">
                <p className="font-semibold text-indigo-900 mb-0.5">考研难点解析：</p>
                <p className="text-slate-600">{item.explanation}</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentAnalysis({
  segment,
  index,
}: {
  segment: Segment;
  index: number;
}) {
  const [showTranslation, setShowTranslation] = useState(true);
  const [expandedSentences, setExpandedSentences] = useState<Record<number, boolean>>({});
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = new Set<string>();
    segment.difficult_words?.forEach((w) => {
      if (isWordSaved(w.word)) saved.add(w.word);
    });
    segment.uncommon_usage?.forEach((u) => {
      if (isWordSaved(u.word)) saved.add(u.word);
    });
    setSavedWords(saved);
  }, [segment]);

  const toggleSaveWord = useCallback(
    (word: string, phonetic: string, meaning: string, synonym: string) => {
      setSavedWords((prev) => {
        const next = new Set(prev);
        if (next.has(word)) {
          removeVocabWord(word);
          next.delete(word);
        } else {
          addVocabWord({
            word,
            phonetic,
            meaning,
            synonym,
            dateAdded: new Date().toISOString(),
          });
          next.add(word);
        }
        return next;
      });
    },
    []
  );

  const toggleSaveUncommon = useCallback((word: string, uncommon_meaning: string) => {
    setSavedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        removeVocabWord(word);
        next.delete(word);
      } else {
        addVocabWord({
          word,
          phonetic: '',
          meaning: uncommon_meaning,
          synonym: '',
          uncommon_meaning,
          dateAdded: new Date().toISOString(),
        });
        next.add(word);
      }
      return next;
    });
  }, []);

  return (
    <div id={`segment-${index}`} className="scroll-mt-4 space-y-5">
      {/* 段落标头 */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs px-2 py-0.5">
          Para {index + 1}
        </Badge>
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          段落深度解析
        </h3>
      </div>

      {/* 1. 重难点词汇 & 熟词僻义 (采用 2 列网格充分利用横向空间) */}
      {(segment.difficult_words?.length > 0 || segment.uncommon_usage?.length > 0) && (
        <div className="space-y-3">
          {segment.difficult_words?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <span>📚</span> 重难点词汇
              </h4>
              {/* 双列布局，横向利用充分 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {segment.difficult_words.map((w, i) => (
                  <div
                    key={`${w.word}-${i}`}
                    className={`relative p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${WORD_COLORS[i % WORD_COLORS.length]}`}
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          toggleSaveWord(w.word, w.phonetic, w.meaning, w.synonym)
                        }
                        className="absolute top-2 right-2 text-sm leading-none hover:scale-125 transition-transform"
                        title={savedWords.has(w.word) ? '取消收藏' : '收藏到词汇本'}
                      >
                        {savedWords.has(w.word) ? '⭐' : '☆'}
                      </button>
                      <div className="font-bold text-sm pr-5 flex items-baseline gap-1.5 flex-wrap">
                        <span>{w.word}</span>
                        {w.phonetic && (
                          <span className="font-normal text-[11px] opacity-60 font-serif">
                            {w.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-800 font-medium leading-snug">{w.meaning}</p>
                    </div>
                    {w.synonym ? (
                      <p className="mt-1.5 text-[10px] opacity-70 border-t border-black/5 pt-1">
                        近义词：{w.synonym}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {segment.uncommon_usage?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                <span>💡</span> 熟词僻义 (考研陷阱)
              </h4>
              {/* 双列布局，横向利用充分 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {segment.uncommon_usage.map((u, i) => (
                  <Card
                    key={`uu-${index}-${i}`}
                    className="bg-amber-50/60 border-amber-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between"
                  >
                    <CardContent className="p-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSaveUncommon(u.word, u.uncommon_meaning)}
                        className="absolute top-2 right-2 text-sm leading-none hover:scale-125 transition-transform"
                        title={savedWords.has(u.word) ? '取消收藏' : '收藏到词汇本'}
                      >
                        {savedWords.has(u.word) ? '⭐' : '☆'}
                      </button>
                      <p className="font-bold text-amber-950 text-xs mb-1 pr-5">{u.word}</p>
                      <div className="text-[11px] space-y-1">
                        <p className="text-slate-500">
                          常见义：{u.common_meaning}
                        </p>
                        <p className="text-amber-900 font-semibold bg-amber-100/80 p-1 rounded border border-amber-200/60">
                          僻义：{u.uncommon_meaning}
                        </p>
                      </div>
                      {u.example ? (
                        <p className="mt-1.5 text-slate-500 text-[10px] italic line-clamp-2 bg-white/40 p-1 rounded">
                          “{u.example}”
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 长难句分析 */}
      {segment.long_sentences?.length > 0 ? (
        <div>
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
            <span>🔍</span> 考研长难句结构拆解
          </h4>
          <div className="space-y-2">
            {segment.long_sentences.map((ls, i) => (
              <div
                key={`ls-${index}-${i}`}
                className="border border-indigo-100 rounded-xl overflow-hidden shadow-xs bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSentences((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                  className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs bg-indigo-50/40 hover:bg-indigo-50/80 transition-colors"
                >
                  <span className="text-indigo-950 font-medium line-clamp-1 flex-1 mr-2 font-serif">
                    {ls.sentence}
                  </span>
                  <span className="text-indigo-500 shrink-0 text-[11px] font-semibold">
                    {expandedSentences[i] ? '收起 ▲' : '拆解 ▼'}
                  </span>
                </button>
                {expandedSentences[i] ? (
                  <div className="px-3.5 py-3 text-xs space-y-2 border-t border-indigo-100 bg-white">
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">原句：</span>
                      <p className="text-slate-900 font-serif text-sm leading-relaxed">{ls.sentence}</p>
                    </div>
                    <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/60">
                      <span className="font-semibold text-indigo-900 block mb-0.5">🌳 语法逻辑：</span>
                      <p className="text-slate-700 leading-relaxed">{ls.analysis}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block mb-0.5">精准翻译：</span>
                      <p className="text-slate-800 font-medium">{ls.translation}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 3. 翻译 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span>🌐</span> 段落精译
          </h4>
          <button
            type="button"
            onClick={() => setShowTranslation((v) => !v)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showTranslation ? '隐藏译文' : '展开译文'}
          </button>
        </div>
        {showTranslation ? (
          <div className="bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl p-3 text-xs text-slate-700 leading-relaxed shadow-xs">
            {segment.paragraph_translation}
          </div>
        ) : null}
      </div>

      {/* 4. 段落总结 */}
      {segment.summary ? (
        <Card className="bg-emerald-50/60 border-emerald-200/80 rounded-xl shadow-xs overflow-hidden">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <span>📝</span> 段落主旨提炼
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0.5">
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              {segment.summary}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function ResultPage() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activePara, setActivePara] = useState(0);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('parseResult');
      if (!raw) {
        setError(true);
      } else {
        const parsed = JSON.parse(raw) as ParseResult;
        if (!parsed?.segments?.length) {
          setError(true);
        } else {
          setData(parsed);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  const scrollToSegment = (index: number) => {
    setActivePara(index);
    setActiveTab('analysis');
    window.setTimeout(() => {
      const el = document.getElementById(`segment-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs tracking-widest">AI 精读生成中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-4">
        <div className="p-4 rounded-full bg-slate-100 text-3xl">📄</div>
        <p className="text-slate-600 text-sm font-medium">未检测到解析数据，请先提交文章</p>
        <Button render={<Link href="/" />} className="bg-indigo-600 hover:bg-indigo-700 text-xs">
          返回首页提交
        </Button>
      </div>
    );
  }

  const allMultipleChoice = data.segments.flatMap((seg, segIdx) =>
    (seg.exercises?.multiple_choice ?? []).map((item, i) => ({
      item,
      key: `mc-${segIdx}-${i}`,
      idPrefix: `seg${segIdx}`,
      globalIndex: 0,
      para: segIdx + 1,
    }))
  );
  allMultipleChoice.forEach((entry, i) => {
    entry.globalIndex = i;
  });

  const allTranslation = data.segments.flatMap((seg, segIdx) =>
    (seg.exercises?.translation ?? []).map((item, i) => ({
      item,
      key: `tr-${segIdx}-${i}`,
      globalIndex: 0,
      para: segIdx + 1,
    }))
  );
  allTranslation.forEach((entry, i) => {
    entry.globalIndex = i;
  });

  return (
    <div className="h-screen overflow-hidden bg-slate-900 font-sans">
      {/* 顶部导航 */}
      <nav className="h-14 bg-slate-900/90 backdrop-blur-md text-white border-b border-slate-800 shrink-0 z-20">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 text-sm">
              📖
            </span>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-100">
                考研外刊 AI 智能精读
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                2026 深度版
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              onClick={() => setVocabOpen(true)}
            >
              <span>⭐</span> 生词本
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
              render={<Link href="/" />}
            >
              返回首页
            </Button>
          </div>
        </div>
      </nav>

      {/* 主工作区：65% 原文阅读 + 35% 解析面板 */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* 左栏：原文阅读 (占 65%，去掉 max-w 限制充分填充空间) */}
        <aside className="w-[65%] bg-[#FAF8F5] overflow-y-auto h-[calc(100vh-56px)] border-r border-slate-200/80 shadow-inner">
          <div className="w-full px-6 md:px-10 py-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📰</span> 原文阅读沉浸区
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                点击段落可联动右侧解析
              </span>
            </div>

            <div className="space-y-5">
              {data.segments.map((seg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToSegment(i)}
                  className={`w-full text-left bg-white rounded-2xl p-6 border transition-all duration-200 group relative ${
                    activePara === i
                      ? 'ring-2 ring-indigo-500/80 border-indigo-500 shadow-md scale-[1.002]'
                      : 'border-slate-200/70 hover:border-slate-300 shadow-xs hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md font-mono border border-indigo-100">
                      Paragraph {i + 1}
                    </span>
                    <span className="text-xs text-slate-300 group-hover:text-indigo-400 transition-colors">
                      查看解析 →
                    </span>
                  </div>

                  {/* 原文：大字号、适宜行高、充分展开 */}
                  <p
                    className="text-lg md:text-[19px] text-slate-800 leading-[1.85] tracking-wide"
                    style={{
                      fontFamily:
                        'Georgia, Garamond, "Times New Roman", serif',
                    }}
                  >
                    {seg.original_text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* 右栏：精讲与练习 (占 35%) */}
        <section
          ref={rightPanelRef}
          className="w-[35%] bg-white overflow-y-auto h-[calc(100vh-56px)] border-l border-slate-100 shadow-xl"
        >
          <div className="p-4 md:p-5">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (typeof value === 'string') setActiveTab(value);
              }}
            >
              <TabsList className="mb-4 grid grid-cols-2 h-10 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger
                  value="analysis"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-xs"
                >
                  📊 段落精讲
                </TabsTrigger>
                <TabsTrigger
                  value="exercises"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-xs"
                >
                  ✏️ 课后练习
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-0 focus-visible:outline-none">
                {data.segments.map((seg, i) => (
                  <div key={i}>
                    <SegmentAnalysis segment={seg} index={i} />
                    {i < data.segments.length - 1 ? (
                      <hr className="my-6 border-dashed border-slate-200" />
                    ) : null}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="exercises" className="space-y-6 focus-visible:outline-none">
                {allMultipleChoice.length === 0 && allTranslation.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-3xl mb-2">📝</p>
                    <p className="text-slate-400 text-xs">本文未生成配套练习题</p>
                  </div>
                ) : (
                  <>
                    {allMultipleChoice.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <span>🎯</span> 考研阅读单选题
                        </h3>
                        <div className="space-y-3.5">
                          {allMultipleChoice.map((entry) => (
                            <div key={entry.key} className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-mono">
                                来自 Para {entry.para}
                              </span>
                              <MultipleChoiceItem
                                item={entry.item}
                                index={entry.globalIndex}
                                idPrefix={entry.idPrefix}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {allTranslation.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <span>✍️</span> 考研划线翻译题
                        </h3>
                        <div className="space-y-3.5">
                          {allTranslation.map((entry) => (
                            <div key={entry.key} className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-mono">
                                来自 Para {entry.para}
                              </span>
                              <TranslationItem
                                item={entry.item}
                                index={entry.globalIndex}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <VocabModal open={vocabOpen} onClose={() => setVocabOpen(false)} />
    </div>
  );
}