#!/usr/bin/env python3
"""
独立的 NVIDIA NIM API 测试脚本
用于诊断 API 连接问题
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

# 加载环境变量
load_dotenv()

NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY")
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
NIM_MODEL = "meta/llama-3.1-8b-instruct"

print("=" * 60)
print("NVIDIA NIM API 诊断工具")
print("=" * 60)

# 1. 检查 API Key
print("\n[1] 检查 API Key 配置...")
if not NIM_API_KEY:
    print("✗ 错误: NVIDIA_NIM_API_KEY 未设置")
    print("  请在 .env 文件中添加: NVIDIA_NIM_API_KEY=你的_api_key")
    sys.exit(1)
else:
    key_preview = NIM_API_KEY[:10] + "..." + NIM_API_KEY[-10:]
    print(f"✓ API Key 已设置: {key_preview}")

# 2. 检查 OpenAI SDK
print("\n[2] 检查 OpenAI SDK...")
try:
    import openai
    print(f"✓ OpenAI SDK 已安装: 版本 {openai.__version__}")
except ImportError:
    print("✗ 错误: OpenAI SDK 未安装")
    print("  请运行: pip install openai>=1.3.0")
    sys.exit(1)

# 3. 初始化客户端
print("\n[3] 初始化 OpenAI 客户端...")
print(f"  Base URL: {NIM_BASE_URL}")
print(f"  Model: {NIM_MODEL}")

try:
    client = OpenAI(
        base_url=NIM_BASE_URL,
        api_key=NIM_API_KEY
    )
    print("✓ 客户端初始化成功")
except Exception as e:
    print(f"✗ 客户端初始化失败: {e}")
    sys.exit(1)

# 4. 测试 API 调用
print("\n[4] 发送测试请求...")
test_messages = [
    {"role": "system", "content": "你是一个友善的旅遊助手。"},
    {"role": "user", "content": "請用一句話介紹台灣的特色美食。"}
]

try:
    response = client.chat.completions.create(
        model=NIM_MODEL,
        messages=test_messages,
        max_tokens=100,
        temperature=0.7,
        timeout=10.0
    )

    print("✓ API 调用成功！")
    print(f"\n[5] 响应内容:")
    print("-" * 60)
    print(response.choices[0].message.content)
    print("-" * 60)

    print("\n[✓] 所有测试通过！NIM API 配置正确。")
    print("\n响应详情:")
    print(f"  - Model: {response.model}")
    print(f"  - Tokens used: {response.usage.total_tokens}")
    print(f"  - Finish reason: {response.choices[0].finish_reason}")

except Exception as e:
    print(f"✗ API 调用失败")
    print(f"\n错误类型: {type(e).__name__}")
    print(f"错误详情: {str(e)}")

    # 尝试给出诊断建议
    print("\n[诊断建议]")
    error_str = str(e).lower()
    if "authentication" in error_str or "invalid" in error_str or "api" in error_str:
        print("  • API Key 可能无效或已过期")
        print("  • 请检查 build.nvidia.com 上的 API Key 状态")
    elif "401" in error_str:
        print("  • 认证失败（401）")
        print("  • 确保 API Key 正确复制，没有多余空格")
    elif "429" in error_str:
        print("  • 速率限制（429）")
        print("  • 请等待几秒钟后重试")
    elif "quota" in error_str.lower() or "limit" in error_str.lower():
        print("  • 配额已用完或超过限制")
        print("  • 请检查 build.nvidia.com 上的使用量")
    elif "timeout" in error_str or "connection" in error_str:
        print("  • 网络连接问题")
        print("  • 检查网络连接是否正常")
    else:
        print("  • 未知错误，请查看完整错误信息")

    sys.exit(1)

print("\n" + "=" * 60)
