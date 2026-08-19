'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getVocabList,
  removeVocabWord,
  getDueWords,
  reviewWord,
  getMasteryLabel,
  type VocabWord,
} from '../utils/vocab';
import {
  getStudyLog,
  getArticleHistory,
  getCorrectRate,
  recordArticleRead,
  recordReview,
} from '../utils/studyLog';
import {
  getUserProfile,
  saveUserProfile,
  getProfileLabel,
  type ExamType,
  type Level,
} from '../utils/userProfile';

// ========== 生词本弹窗 ==========

function VocabModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<VocabWord[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (open) {
      setList(getVocabList());
      setReviewMode(false);
      setCurrentIndex(0);
      setRevealed(false);
    }
  }, [open]);

  if (!open) return null;

  const handleRemove = (word: string) => {
    removeVocabWord(word);
    setList(getVocabList());
  };

  const dueWords = getDueWords();

  const goNext = (isCorrect: boolean) => {
    const currentWord = dueWords[currentIndex];
    if (!currentWord) return;
    reviewWord(currentWord.word, isCorrect);
    recordReview();
    setRevealed(false);
    if (currentIndex < dueWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setReviewMode(false);
      setList(getVocabList());
    }
  };

  const displayList = list.slice(0, 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <h2 className="text-base font-semibold">生词本与核心积累</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-1" aria-label="关闭">×</button>
        </div>

        {dueWords.length > 0 && !reviewMode && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">📅 {dueWords.length} 个单词到期复习</p>
            <button
              type="button"
              onClick={() => { setReviewMode(true); setCurrentIndex(0); setRevealed(false); }}
              className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              开始复习
            </button>
          </div>
        )}

        {reviewMode && dueWords.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center gap-5">
            <p className="text-xs text-slate-400 font-mono">{currentIndex + 1} / {dueWords.length}</p>
            <div className="text-center w-full">
              <p className="text-3xl font-bold text-slate-900 mb-2">{dueWords[currentIndex].word}</p>
              {dueWords[currentIndex].phonetic && (
                <p className="text-sm text-slate-400 font-serif mb-4">{dueWords[currentIndex].phonetic}</p>
              )}
              {revealed ? (
                <div className="p-4 bg-slate-50 rounded-xl max-w-sm mx-auto border border-slate-100">
                  <p className="text-base text-slate-700 font-medium">{dueWords[currentIndex].meaning}</p>
                  {dueWords[currentIndex].synonym && (
                    <p className="text-xs text-slate-400 mt-1.5">近义：{dueWords[currentIndex].synonym}</p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl max-w-sm mx-auto">
                  <p className="text-sm text-slate-400">先回忆这个词的意思...</p>
                </div>
              )}
            </div>

            {!revealed ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => goNext(false)}
                  className="px-8 py-2.5 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-md"
                >
                  ✗ 不认识
                </button>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="px-8 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-md"
                >
                  ✓ 认识
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => goNext(false)}
                  className="px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors shadow-md"
                >
                  🤔 记错了
                </button>
                <button
                  type="button"
                  onClick={() => goNext(true)}
                  className="px-8 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-md"
                >
                  ✓ 下一词
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-4 space-y-3 bg-slate-50/50 flex-1">
            {reviewMode && dueWords.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">🎉 暂无到期单词</p>
            )}
            {displayList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📖</p>
                <p className="text-sm text-slate-400">暂无收藏单词，点击星号随时积累</p>
              </div>
            ) : (
              displayList.map((item) => (
                <div key={item.word} className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-xs hover:border-indigo-300 transition-all">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">{item.word}</span>
                      {item.phonetic ? <span className="text-xs text-slate-400 font-serif">{item.phonetic}</span> : null}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{item.meaning}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {item.synonym ? <span className="text-[10px] text-slate-400">近义：{item.synonym}</span> : null}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                        {getMasteryLabel(item.mastery)}
                      </span>
                      {item.nextReview ? (
                        <span className="text-[10px] text-slate-400">
                          下次复习：{new Date(item.nextReview).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemove(item.word)} className="shrink-0 px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100">
                    移除
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 用户画像弹窗 ==========

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [examType, setExamType] = useState<ExamType>('kaoyan');
  const [level, setLevel] = useState<Level>('intermediate');
  const [targetScore, setTargetScore] = useState('');

  useEffect(() => {
    if (open) {
      const p = getUserProfile();
      if (p) {
        setExamType(p.examType);
        setLevel(p.level);
        setTargetScore(p.targetScore);
      }
    }
  }, [open]);

  const handleSave = () => {
    saveUserProfile({
      examType,
      level,
      targetScore: targetScore.trim(),
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  if (!open) return null;

  const examOptions: Array<{ value: ExamType; label: string }> = [
    { value: 'kaoyan', label: '考研英语' },
    { value: 'cet6', label: 'CET-6' },
    { value: 'ielts', label: 'IELTS' },
    { value: 'toefl', label: 'TOEFL' },
  ];

  const levelOptions: Array<{ value: Level; label: string }> = [
    { value: 'basic', label: '基础' },
    { value: 'intermediate', label: '中等' },
    { value: 'advanced', label: '较强' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <h2 className="text-base font-semibold">🎯 你的英语学习目标</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-1" aria-label="关闭">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">备考方向</p>
            <div className="grid grid-cols-2 gap-2">
              {examOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamType(opt.value)}
                  className={`px-4 py-2.5 text-sm rounded-xl border transition-all font-medium ${
                    examType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">当前水平</p>
            <div className="grid grid-cols-3 gap-2">
              {levelOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLevel(opt.value)}
                  className={`px-4 py-2.5 text-sm rounded-xl border transition-all font-medium ${
                    level === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">目标分数（可选）</p>
            <input
              type="text"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder="如：考研英语 75+ 或 IELTS 7.0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md"
          >
            保存画像
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== 学习记录弹窗 ==========

function StudyLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const log = getStudyLog();
  const history = getArticleHistory();
  const list = getVocabList();
  const mastered = list.filter((item) => item.mastery >= 4).length;
  const vocabStats = {
    total: list.length,
    mastered,
    toReview: Math.max(list.length - mastered, 0),
  };

  const correctRate = getCorrectRate();
  const difficultyLabel = (difficulty: string) => difficulty.split(' ')[0] || '待评级';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-base font-semibold">学习记录</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-1" aria-label="关闭">×</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/50 flex-1">
          <section>
            <h3 className="text-sm font-bold text-slate-700 mb-2">📰 阅读</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{log.totalArticles}</p>
                <p className="text-[10px] text-slate-400">解析文章</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{log.totalWords.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">累计阅读词</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{log.totalReviews}</p>
                <p className="text-[10px] text-slate-400">复习次数</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-700 mb-2">📚 词汇</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{vocabStats.total}</p>
                <p className="text-[10px] text-blue-500">累计收录</p>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{vocabStats.mastered}</p>
                <p className="text-[10px] text-emerald-500">已掌握</p>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
                <p className="text-lg font-bold text-amber-700">{vocabStats.toReview}</p>
                <p className="text-[10px] text-amber-500">待复习</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-700 mb-2">✏️ 练习</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{log.totalExercisesCompleted}<span className="text-xs font-normal text-slate-400"> 题</span></p>
                <p className="text-[10px] text-slate-400">完成练习</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">{correctRate}%</p>
                <p className="text-[10px] text-slate-400">正确率</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-700 mb-2">🕘 最近阅读</h3>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-1">📄</p>
                <p className="text-xs text-slate-400">暂无阅读记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-100">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-slate-700 truncate">{item.title}</p>
                        <span className="text-[11px] text-amber-500 shrink-0">{difficultyLabel(item.difficulty)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {item.wordCount} 词 · {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {item.status === 'completed' ? '已完成' : '复习中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ========== 主页面 ==========

export default function HomePage() {
  const [article, setArticle] = useState('');
  const [loading, setLoading] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileNavLabel, setProfileNavLabel] = useState('设置目标');
  const [url, setUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [articleTitle, setArticleTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (profileOpen) return;
    setProfileNavLabel(getUserProfile() ? `🎯 ${getProfileLabel()}` : '设置目标');
  }, [profileOpen]);

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      alert('请输入文章链接');
      return;
    }

    setFetchingUrl(true);
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `抓取失败（${res.status}）`);
      }

      const data = await res.json();
      const cleanText = data.text
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      setArticle(cleanText);
      setArticleTitle(data.title || '外刊精读');

      alert(`抓取成功！文章标题：${data.title}，共 ${data.word_count} 词`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '抓取失败，请稍后重试');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleParse = async () => {
    if (!article.trim()) {
      alert('请先粘贴英文文章');
      return;
    }

    const cleanArticle = article
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    setLoading(true);
    try {
      const profile = getUserProfile();
      const API_BASE = 'https://ai-english-reading-assistant.onrender.com';
      const res = await fetch('${API_BASE}/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: cleanArticle, profile }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `请求失败（${res.status}）`);
      }

      const data = await res.json();
      sessionStorage.setItem('parseResult', JSON.stringify(data));
      const wordCount = cleanArticle.split(/\s+/).filter(Boolean).length;
      recordArticleRead(wordCount, articleTitle.trim() || '外刊精读');
      router.push('/result');
    } catch (e) {
      alert(e instanceof Error ? e.message : '解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span>📖</span>
            <span>考研外刊 AI 精读</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {profileNavLabel}
            </button>
            <button
              onClick={() => setVocabOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              我的词汇本
            </button>
            <button
              onClick={() => setStudyOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              学习记录
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">外刊精读解析器</h1>
          <p className="text-sm text-gray-500 mb-6 text-center">粘贴英文外刊，一键生成考研级别精读笔记</p>

          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="或粘贴文章链接（支持 FT、Economist 等）..."
              disabled={fetchingUrl}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
            />
            <button
              onClick={handleFetchUrl}
              disabled={fetchingUrl || !url.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {fetchingUrl ? '抓取中...' : '抓取文章'}
            </button>
          </div>

          <textarea
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            disabled={loading}
            placeholder="请粘贴英文外刊文章（支持 FT、Economist 等考研题源外刊）..."
            className="w-full h-[400px] p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-700 text-sm leading-relaxed disabled:bg-gray-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleParse}
            disabled={loading}
            className="mt-6 w-full py-3.5 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI 正在深度解析中...
              </>
            ) : (
              '开始智能解析'
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          支持 10,000 字长文 · AI 逐段精读 · 考研难度评级 · 课后习题自动生成
        </p>
      </main>

      <VocabModal open={vocabOpen} onClose={() => setVocabOpen(false)} />
      <StudyLogModal open={studyOpen} onClose={() => setStudyOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}