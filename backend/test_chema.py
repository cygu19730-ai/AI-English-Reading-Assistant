"""测试 Pydantic Schema 的纠错能力"""
from main import MultipleChoice, ParseResponse

# 测试 1: answer 是完整选项 "A. xxx" → 应该自动提取为 "A"
print("测试 1: answer 自动提取首字母")
mc = MultipleChoice(
    question="test",
    options=["A. x", "B. y", "C. z", "D. w"],
    answer="A. x",
    explanation=""
)
print(f"  输入: 'A. x' → 输出: '{mc.answer}'")
assert mc.answer == "A"
print("  ✅ 通过")

# 测试 2: answer 是小写 "b" → 应该转为 "B"
print("测试 2: answer 大小写归一")
mc = MultipleChoice(
    question="test",
    options=["A. x", "B. y", "C. z", "D. w"],
    answer="b",
    explanation=""
)
print(f"  输入: 'b' → 输出: '{mc.answer}'")
assert mc.answer == "B"
print("  ✅ 通过")

# 测试 3: options 没有前缀 → 应该自动补 A. B. C. D.
print("测试 3: options 自动补前缀")
mc = MultipleChoice(
    question="test",
    options=["xxx", "yyy", "zzz", "www"],
    answer="C",
    explanation=""
)
print(f"  输入: ['xxx', 'yyy', 'zzz', 'www']")
print(f"  输出: {mc.options}")
assert mc.options[0].startswith("A.")
print("  ✅ 通过")

# 测试 4: answer 非法 → 应该报错
print("测试 4: answer 非法时应该报错")
try:
    mc = MultipleChoice(
        question="test",
        options=["A. x", "B. y", "C. z", "D. w"],
        answer="E",
        explanation=""
    )
    print("  ❌ 没报错！")
except Exception as e:
    print(f"  ✅ 正确报错: {e}")

print()
print("所有 Schema 测试通过！")