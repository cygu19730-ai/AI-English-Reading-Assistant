'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getVocabList, removeVocabWord, type VocabWord } from '../utils/vocab';

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

  const displayList = list.slice(0, 20);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">我的词汇本</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-3">
          {displayList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无收藏单词</p>
          ) : (
            displayList.map((item) => (
              <div
                key={item.word}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{item.word}</span>
                    {item.phonetic ? (
                      <span className="text-sm text-gray-500">{item.phonetic}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.meaning}</p>
                  {item.synonym ? (
                    <p className="text-xs text-gray-400 mt-0.5">近义：{item.synonym}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.word)}
                  className="shrink-0 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [article, setArticle] = useState('');
  const [loading, setLoading] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const router = useRouter();

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
      // 清理不可见控制字符，避免 JSON 序列化失败
      const cleanText = data.text
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      setArticle(cleanText);
      
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
    // 清理文章中的特殊 Unicode 字符，替换为 ASCII 等价字符
    const cleanArticle = article
      .replace(/[\u2018\u2019]/g, "'")   // 中文单引号 → 英文单引号
      .replace(/[\u201C\u201D]/g, '"')   // 中文双引号 → 英文双引号
      .replace(/[\u2013\u2014]/g, '-')   // 中文破折号 → 英文连字符
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // 移除不可见控制字符

    setLoading(true);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `请求失败（${res.status}）`);
      }

      const data = await res.json();
      sessionStorage.setItem('parseResult', JSON.stringify(data));
      router.push('/result');
    } catch (e) {
      alert(e instanceof Error ? e.message : '解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span>📖</span>
            <span>考研外刊 AI 精读</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVocabOpen(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              我的词汇本
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              学习记录
            </button>
          </div>
        </div>
      </nav>

      {/* 主体内容 */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            外刊精读解析器
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            粘贴英文外刊，一键生成考研级别精读笔记
          </p>
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
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                AI 正在深度解析中...
              </>
            ) : (
              '开始智能解析'
            )}
          </button>
        </div>

        {/* 底部说明 */}
        <p className="mt-6 text-center text-xs text-gray-400">
          支持 10,000 字长文 · AI 逐段精读 · 考研难度评级 · 课后习题自动生成
        </p>
      </main>

      {/* 词汇本弹窗 */}
      <VocabModal open={vocabOpen} onClose={() => setVocabOpen(false)} />
    </div>
  );
}