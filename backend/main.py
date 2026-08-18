import json
import os
import traceback
from typing import Any

import requests
import trafilatura
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="English Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """你是一位考研英语精读辅导老师。请对用户提供的英文文章做考研级别的精读解析。

严格按以下 JSON 结构返回（不要输出 Markdown 代码块或其他多余文字）：
{
  "article_meta": {
    "topic": "文章主题（英文，如 Technology / Education / Society / Economics）",
    "core_argument": "文章核心论点（1-2 句英文概括）",
    "difficulty_score": 4.0
  },
  "segments": [
    {
      "original_text": "原文段落",
      "difficult_words": [
        {
          "word": "单词",
          "phonetic": "音标",
          "meaning": "中文释义",
          "synonym": "同义词"
        }
      ],
      "uncommon_usage": [
        {
          "word": "熟词",
          "common_meaning": "常见义",
          "uncommon_meaning": "此处僻义",
          "example": "文中用法说明"
        }
      ],
      "long_sentences": [
        {
          "sentence": "长难句原文",
          "analysis": "句法结构分析",
          "translation": "中文翻译"
        }
      ],
      "paragraph_translation": "段落完整中文翻译",
      "summary": "段落总结（中文）",
      "exercises": {
        "multiple_choice": [
          {
            "question": "题目",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A",
            "explanation": "解析"
          }
        ],
        "translation": [
          {
            "question": "英译中或中译英题目",
            "answer": "参考答案",
            "explanation": "解析"
          }
        ]
      }
    }
  ]
}

要求：
1. 按自然段落拆分 segments，每段独立解析。
2. difficult_words 选取考研级别重难点词（约 3–8 个/段，视段落长度调整）。
3. uncommon_usage 指出熟词僻义；若无则返回空数组。
4. long_sentences 选取结构复杂的长难句；若无则返回空数组。
5. 练习题出题规则（灵活掌握，不要每段都强行出题）：
   - 只有信息量足够、有明确考点的段落才出单选题
   - 只有含典型翻译难点（如长难句、特殊句式、熟词僻义）的段落才出翻译题
   - 整篇文章至少出 3 道单选题和 2 道翻译题
   - 如果某段不适合出题，exercises 里的对应数组可以为空
6. multiple_choice 的 options 必须是 4 个，且以 "A. "、"B. "、"C. "、"D. " 开头
7. multiple_choice 的 answer 字段只能填 "A"、"B"、"C" 或 "D"，不要填完整选项内容
8. article_meta 的 difficulty_score 是 1-5 的浮点数，根据词汇难度、句法复杂度、文章长度综合判断
9. article_meta 的 topic 用英文返回，core_argument 用英文概括
10. 只返回合法 JSON，字段名必须与上述一致。
"""


# ========== Pydantic Schema 定义 ==========

class DifficultWord(BaseModel):
    word: str = Field(..., min_length=1)
    phonetic: str = Field(default="")
    meaning: str = Field(default="")
    synonym: str = Field(default="")


class UncommonUsage(BaseModel):
    word: str = Field(..., min_length=1)
    common_meaning: str = Field(default="")
    uncommon_meaning: str = Field(default="")
    example: str = Field(default="")


class LongSentence(BaseModel):
    sentence: str = Field(..., min_length=1)
    analysis: str = Field(default="")
    translation: str = Field(default="")


class MultipleChoice(BaseModel):
    question: str = Field(..., min_length=1)
    options: list[str] = Field(..., min_length=4, max_length=4)
    answer: str = Field(..., min_length=1)
    explanation: str = Field(default="")

    @field_validator("answer")
    @classmethod
    def normalize_answer(cls, v: str) -> str:
        v_upper = v.strip().upper()
        if len(v_upper) > 1 and v_upper[0] in ("A", "B", "C", "D"):
            return v_upper[0]
        if v_upper not in ("A", "B", "C", "D"):
            raise ValueError(f"answer 必须是 A/B/C/D，实际是: {v}")
        return v_upper

    @field_validator("options")
    @classmethod
    def normalize_options(cls, v: list[str]) -> list[str]:
        for i, opt in enumerate(v):
            expected = chr(ord("A") + i)
            stripped = opt.strip()
            if not stripped.startswith(expected + ".") and not stripped.startswith(expected + " "):
                v[i] = f"{expected}. {stripped}"
        return v


class TranslationExercise(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(default="")
    explanation: str = Field(default="")


class Exercises(BaseModel):
    multiple_choice: list[MultipleChoice] = Field(default_factory=list)
    translation: list[TranslationExercise] = Field(default_factory=list)


class Segment(BaseModel):
    original_text: str = Field(..., min_length=1)
    difficult_words: list[DifficultWord] = Field(default_factory=list)
    uncommon_usage: list[UncommonUsage] = Field(default_factory=list)
    long_sentences: list[LongSentence] = Field(default_factory=list)
    paragraph_translation: str = Field(default="")
    summary: str = Field(default="")
    exercises: Exercises = Field(default_factory=Exercises)


class ArticleMeta(BaseModel):
    topic: str = Field(default="", description="文章主题")
    core_argument: str = Field(default="", description="核心论点")
    difficulty_score: float = Field(default=3.0, ge=1.0, le=5.0, description="难度分数 1-5")


class ParseResponse(BaseModel):
    article_meta: Optional[ArticleMeta] = Field(default=None, description="文章级元信息")
    segments: list[Segment] = Field(..., min_length=1)


class ParseRequest(BaseModel):
    article: str = Field(..., min_length=1, description="英文文章全文")
    profile: Optional[dict] = Field(default=None, description="用户画像")


class UrlParseRequest(BaseModel):
    url: str = Field(..., min_length=1, description="文章URL")


class UrlParseResponse(BaseModel):
    title: str
    text: str
    word_count: int


# ========== 工具函数 ==========

def get_api_key() -> str:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="服务器未配置 DEEPSEEK_API_KEY，请在 .env 中设置。",
        )
    return api_key

def repair_json(content: str) -> str:
    """尝试修复常见的 JSON 语法错误"""
    text = content.strip()
    
    # 去掉 Markdown 代码块
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    
    # 修复缺失逗号：数字或字符串后面直接跟换行 + 引号/花括号
    import re
    # 行尾是数字但没有逗号，下一行以引号开头
    text = re.sub(r'(\d+)\s*\n\s*"', r'\1,\n  "', text)
    # 行尾是 } 但没有逗号，下一行以 " 开头
    text = re.sub(r'}\s*\n\s*"', r'},\n  "', text)
    # 行尾是 ] 但没有逗号，下一行以 " 开头
    text = re.sub(r'\]\s*\n\s*"', r'],\n  "', text)
    # 字符串后面直接跟 }
    text = re.sub(r'"\s*\n\s*}', '"\n  }', text)
    
    return text

def parse_model_json(content: str) -> dict[str, Any]:
    text = repair_json(content)
    
    # 先尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # 如果失败，尝试更激进的修复
    try:
        # 找到第一个 { 和最后一个 }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start:end+1]
            return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # 还是失败，抛出原始错误
    raise json.JSONDecodeError("无法解析 JSON", content, 0)


def build_profile_prompt(profile: Optional[dict]) -> str:
    """根据前端用户画像生成个性化解析提示词。"""
    if not profile:
        return ""

    exam_type = profile.get("examType", "kaoyan")
    level = profile.get("level", "intermediate")
    target = profile.get("targetScore", "")

    exam_map = {
        "kaoyan": "考研英语",
        "cet6": "CET-6",
        "ielts": "IELTS",
        "toefl": "TOEFL",
    }
    level_map = {
        "basic": "基础较弱",
        "intermediate": "中等水平",
        "advanced": "基础较强",
    }

    prompt = f"""
用户画像：
- 备考方向：{exam_map.get(exam_type, "考研英语")}
- 英语水平：{level_map.get(level, "中等水平")}
- 目标分数：{target if target else "未指定"}

个性化调整要求：
"""
    if level == "basic":
        prompt += """
- 词汇解释要更详细，每个重点词给出 1 个例句
- 长难句分析要拆解到最细，标注主干和修饰成分
- 段落翻译要更直白，更贴近字面意思
- 练习题难度略低于考研真题
"""
    elif level == "intermediate":
        prompt += """
- 词汇解释保持标准，重点标注熟词僻义
- 长难句分析拆解主干和关键从句
- 段落翻译流畅自然
- 练习题难度贴近考研真题
"""
    else:
        prompt += """
- 减少基础词汇，重点强化熟词僻义和高级表达
- 长难句分析只标注最难的部分，不拆太细
- 段落翻译偏文学化，强调信达雅
- 练习题难度略高于考研真题，侧重逻辑推断题
"""
    return prompt


def call_deepseek_api(article: str, profile: Optional[dict] = None) -> dict[str, Any]:
    api_key = get_api_key()
    url = "https://api.deepseek.com/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + build_profile_prompt(profile)},
            {"role": "user", "content": article},
        ],
        "temperature": 0.3,
        "stream": False,
        "max_tokens": 8000,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=300,
            proxies={"http": None, "https": None},
        )
        response.raise_for_status()
        result = response.json()
        return result

    except requests.exceptions.ConnectionError as e:
        raise HTTPException(status_code=502, detail=f"无法连接 DeepSeek API（可能是网络问题）：{e}")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="DeepSeek API 请求超时，请稍后重试。")
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code
        detail = e.response.text
        if status == 401:
            raise HTTPException(status_code=502, detail="DeepSeek API 鉴权失败，请检查 DEEPSEEK_API_KEY。")
        elif status == 429:
            raise HTTPException(status_code=429, detail="DeepSeek API 请求频率超限，请稍后重试。")
        else:
            raise HTTPException(status_code=502, detail=f"DeepSeek API 返回错误（{status}）：{detail}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"服务内部错误：{e}")


# ========== API 接口 ==========

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/fetch-url", response_model=UrlParseResponse)
def fetch_url(body: UrlParseRequest) -> UrlParseResponse:
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="url 不能为空。")

    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded is None:
            raise HTTPException(status_code=502, detail="无法访问该 URL，请检查链接是否正确。")

        text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        if not text or len(text.strip()) < 50:
            raise HTTPException(status_code=502, detail="未能从该页面提取到有效文章内容（可能不是文章页）。")

        title = ""
        try:
            from trafilatura.metadata import extract_metadata
            metadata = extract_metadata(downloaded)
            if metadata:
                title = metadata.title or ""
        except Exception:
            pass

        word_count = len(text.split())

        return UrlParseResponse(
            title=title or "未提取到标题",
            text=text.strip(),
            word_count=word_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"抓取文章失败：{e}")


@app.post("/api/parse", response_model=ParseResponse)
def parse_article(body: ParseRequest) -> ParseResponse:
    article = body.article.strip()
    if not article:
        raise HTTPException(status_code=400, detail="article 不能为空。")

    result = call_deepseek_api(article, body.profile)

    choices = result.get("choices")
    if not choices or len(choices) == 0:
        raise HTTPException(status_code=502, detail="模型返回结果为空。")

    raw = choices[0].get("message", {}).get("content", "")
    if not raw:
        raise HTTPException(status_code=502, detail="模型返回内容为空。")

    # Step 1: JSON 解析
    try:
        data = parse_model_json(raw)
    except json.JSONDecodeError:
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"模型返回的内容不是合法 JSON。原始内容：{raw[:2000]}",
        )

    segments = data.get("segments")
    if not isinstance(segments, list):
        raise HTTPException(status_code=502, detail="模型返回缺少合法的 segments 字段。")

    # Step 2: Schema Validation
    try:
        parsed_response = ParseResponse(segments=segments)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"模型输出未通过 Schema Validation：{str(e)[:500]}",
        )

    # Step 2.5: 解析 article_meta（可选，失败不阻断）
    article_meta_raw = data.get("article_meta")
    if article_meta_raw and isinstance(article_meta_raw, dict):
        try:
            parsed_response.article_meta = ArticleMeta(**article_meta_raw)
        except Exception:
            print(f"[Warning] article_meta 解析失败，已忽略: {article_meta_raw}")

    # Step 3: 内容质量检查
    total_mc = 0
    total_translation = 0
    critical_issues: list[str] = []

    for i, seg in enumerate(parsed_response.segments):
        if not seg.original_text.strip():
            critical_issues.append(f"第{i+1}段 original_text 为空")
        total_mc += len(seg.exercises.multiple_choice)
        total_translation += len(seg.exercises.translation)

    if critical_issues:
        raise HTTPException(
            status_code=502,
            detail=f"模型输出缺少原文段落：{critical_issues[:3]}",
        )

    if total_mc < 1 and total_translation < 1:
        raise HTTPException(
            status_code=502,
            detail="模型输出没有任何练习题，请重试。",
        )

    print(f"[Parse Success] {len(parsed_response.segments)} 段 | {total_mc} 单选题 | {total_translation} 翻译题 | meta: {parsed_response.article_meta is not None}")

    return parsed_response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)