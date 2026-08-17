import requests
import json

BASE_URL = "http://localhost:8000"

# 测试文章
article = """Artificial intelligence is transforming education. However, many educators remain skeptical about its impact on critical thinking skills. Students who rely too heavily on AI tools may fail to develop their own analytical abilities.

The rapid advancement of AI technology has outpaced the development of ethical guidelines. Researchers warn that without proper oversight, AI systems could perpetuate biases and make decisions that harm vulnerable populations. Policymakers are now scrambling to catch up.

Despite these challenges, the potential benefits of AI in education are substantial. Personalized learning platforms can adapt to individual student needs, providing targeted practice and immediate feedback. The key is finding the right balance between technological innovation and human guidance."""

# 测试 1: 健康检查
print("=" * 50)
print("测试 1: 健康检查")
resp = requests.get(f"{BASE_URL}/health")
print(f"状态码: {resp.status_code}")
print(f"返回: {resp.json()}")
print()

# 测试 2: 解析文章
print("=" * 50)
print("测试 2: 解析文章")
resp = requests.post(
    f"{BASE_URL}/api/parse",
    json={"article": article},
    timeout=300,
)
print(f"状态码: {resp.status_code}")

if resp.status_code == 200:
    data = resp.json()
    segments = data["segments"]
    print(f"段落数: {len(segments)}")
    print()

    for i, seg in enumerate(segments):
        print(f"--- 第{i+1}段 ---")
        print(f"原文: {seg['original_text'][:80]}...")
        print(f"重难点词: {len(seg['difficult_words'])} 个")
        for w in seg['difficult_words']:
            print(f"  - {w['word']} {w.get('phonetic', '')} → {w.get('meaning', '')}")
        print(f"熟词僻义: {len(seg['uncommon_usage'])} 个")
        print(f"长难句: {len(seg['long_sentences'])} 个")
        print(f"单选题: {len(seg['exercises']['multiple_choice'])} 道")
        for mc in seg['exercises']['multiple_choice']:
            print(f"  Q: {mc['question'][:60]}...")
            print(f"  Options: {len(mc['options'])} 个")
            print(f"  Answer: {mc['answer']}")
        print(f"翻译题: {len(seg['exercises']['translation'])} 道")
        print(f"总结: {seg['summary'][:60]}...")
        print()

    # 验证 Schema
    print("=" * 50)
    print("Schema 验证:")
    for i, seg in enumerate(segments):
        # 检查 answer 是否为 A/B/C/D
        for mc in seg['exercises']['multiple_choice']:
            assert mc['answer'] in ('A', 'B', 'C', 'D'), f"第{i+1}段 answer 非法: {mc['answer']}"
        # 检查 options 是否为 4 个
        for mc in seg['exercises']['multiple_choice']:
            assert len(mc['options']) == 4, f"第{i+1}段 options 不是4个"
        # 检查 original_text 非空
        assert seg['original_text'].strip(), f"第{i+1}段 original_text 为空"
    print("✅ 所有 Schema 检查通过")

elif resp.status_code == 502:
    print(f"解析失败: {resp.json().get('detail', '未知错误')}")
else:
    print(f"HTTP错误: {resp.text[:500]}")

print()
print("=" * 50)
print("测试 3: URL 抓取")
resp = requests.post(
    f"{BASE_URL}/api/fetch-url",
    json={"url": "https://www.chinadaily.com.cn/a/202608/03/WS6a6fecb5a310986e2b468a0d.html"},
    timeout=30,
)
print(f"状态码: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print(f"标题: {data['title']}")
    print(f"字数: {data['word_count']}")
    print(f"正文前100字: {data['text'][:100]}...")