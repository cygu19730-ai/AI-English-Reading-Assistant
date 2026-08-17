# 📖 考研外刊 AI 精读解析器

> 粘贴一篇英文外刊，一键生成考研级别的精读笔记。

基于大语言模型（DeepSeek）的智能英语精读学习工具，专为考研英语备考设计。自动完成词汇标注、熟词僻义识别、长难句拆解、段落翻译总结和课后习题生成。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔗 URL 自动抓取 | 粘贴文章链接，自动提取正文（基于 trafilatura） |
| 📚 重难点词汇 | 自动筛选考研级别词汇，含音标、释义、同义词 |
| 💡 熟词僻义 | 识别常见词的生僻用法（如 liability 责任 vs 债务） |
| 🔍 长难句拆解 | 句法结构分析 + 中文翻译 |
| 🌐 段落翻译 | 逐段全文翻译，可隐藏避免干扰 |
| 📝 段落总结 | AI 生成中文段落主旨概括 |
| ✏️ 课后练习 | 单选题 + 翻译题，自动判分与解析 |
| ⭐ 生词本 | 点击收藏，localStorage 持久化，可复习管理 |

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 (App Router) + React + Tailwind CSS + shadcn/ui |
| 后端 | Python FastAPI |
| AI | DeepSeek API（deepseek-chat 模型） |
| 内容提取 | trafilatura |
| 数据存储 | localStorage（生词本）/ sessionStorage（解析结果） |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- Python ≥ 3.9
- DeepSeek API Key（[免费注册](https://platform.deepseek.com)）

### 1. 克隆项目

\`\`\`bash
git clone https://github.com/你的用户名/kaoyan-ai-reader.git
cd kaoyan-ai-reader
\`\`\`

### 2. 配置 API Key

在 \`backend/\` 目录下创建 \`.env\` 文件：

\`\`\`
DEEPSEEK_API_KEY=sk-你的key
\`\`\`

### 3. 安装依赖

\`\`\`bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd ../frontend
npm install

# 根目录（一键启动工具）
cd ..
npm install
\`\`\`

### 4. 启动

\`\`\`bash
npm run dev
\`\`\`

浏览器自动打开：

- 🏠 前端界面：<http://localhost:3000>
- 📖 API 文档：<http://localhost:8000/docs>

---

## 📖 使用方式

### 方式一：URL 抓取

1. 复制一篇英文文章链接（如 China Daily、VOA 等）
2. 粘贴到首页 URL 输入框
3. 点击 **"抓取文章"**
4. 正文自动填入后，点击 **"开始智能解析"**

### 方式二：手动粘贴

1. 复制文章正文
2. 粘贴到首页大文本框
3. 点击 **"开始智能解析"**

### 结果页操作

- 📰 **左栏**：原文阅读，点击段落可联动右侧解析
- 📊 **右栏 Tab1**：词汇、熟词僻义、长难句、翻译、总结
- ✏️ **右栏 Tab2**：课后练习题
- ⭐ **收藏**：点击词条星标存入生词本

---

## 📁 项目结构

\`\`\`
kaoyan-ai-reader/
├── backend/                # FastAPI 后端
│   ├── main.py             # API 入口（/api/parse, /api/fetch-url）
│   ├── requirements.txt    # Python 依赖
│   └── .env                # API Key（需自行创建）
├── frontend/               # Next.js 前端
│   ├── app/
│   │   ├── page.tsx        # 首页
│   │   ├── result/
│   │   │   └── page.tsx    # 精读结果页
│   │   └── utils/
│   │       └── vocab.ts    # 生词本工具
│   └── components/ui/      # shadcn 组件
└── package.json            # 根目录，一键启动脚本
\`\`\`

---

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /api/parse | 解析英文文章（body: {article}） |
| POST | /api/fetch-url | 抓取 URL 正文（body: {url}） |

---

## ⚠️ 常见问题

### Q: 国内能直接使用吗？

DeepSeek 国内可用。URL 抓取功能对部分境外网站（如 BBC）可能受限，建议使用 China Daily、VOA 等国内可访问的英文源。

### Q: 解析一篇 500 词文章大概多少钱？

使用 DeepSeek API，约 ¥0.01-0.05，非常便宜。

### Q: 生词本数据存在哪里？

浏览器 localStorage，换浏览器或清除缓存会丢失。后续可接入数据库。

---

## 📄 License

MIT License