import json
import os
import traceback
from typing import Any

import requests
import trafilatura
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
            "answer": "正确答案（如 A）",
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
5. exercises 中 multiple_choice 每段至少 1 题，translation 每段至少 1 题。
6. 只返回合法 JSON，字段名必须与上述一致。
"""


class ParseRequest(BaseModel):
    article: str = Field(..., min_length=1, description="英文文章全文")


class ParseResponse(BaseModel):
    segments: list[dict[str, Any]]


class UrlParseRequest(BaseModel):
    url: str = Field(..., min_length=1, description="文章URL")


class UrlParseResponse(BaseModel):
    title: str
    text: str
    word_count: int


def get_api_key() -> str:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="服务器未配置 DEEPSEEK_API_KEY，请在 .env 中设置。",
        )
    return api_key


def parse_model_json(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


def call_deepseek_api(article: str) -> dict[str, Any]:
    api_key = get_api_key()
    url = "https://api.deepseek.com/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": article},
        ],
        "temperature": 0.3,
        "stream": False,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=120,
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

    result = call_deepseek_api(article)

    choices = result.get("choices")
    if not choices or len(choices) == 0:
        raise HTTPException(status_code=502, detail="模型返回结果为空。")

    raw = choices[0].get("message", {}).get("content", "")
    if not raw:
        raise HTTPException(status_code=502, detail="模型返回内容为空。")

    try:
        data = parse_model_json(raw)
    except json.JSONDecodeError:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"模型返回的内容不是合法 JSON。原始内容：{raw[:500]}")

    segments = data.get("segments")
    if not isinstance(segments, list):
        raise HTTPException(status_code=502, detail="模型返回缺少合法的 segments 字段。")

    return ParseResponse(segments=segments)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)