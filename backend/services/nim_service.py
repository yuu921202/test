import os
from openai import OpenAI
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# NVIDIA NIM 模型选择
NIM_MODEL = "meta/llama-3.1-8b-instruct"

# 初始化 NVIDIA NIM 客户端
NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY")

if NIM_API_KEY:
    try:
        nim_client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=NIM_API_KEY
        )
    except Exception as e:
        logger.error(f"初始化 NIM 客户端失败: {e}")
        nim_client = None
else:
    nim_client = None
    logger.warning("NVIDIA_NIM_API_KEY 未设置，NIM 服务不可用")


def call_nim(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 500,
    temperature: float = 0.7
) -> Optional[str]:
    """
    调用 NVIDIA NIM API

    Args:
        system_prompt: 系统提示词
        user_prompt: 用户提示词
        max_tokens: 最大生成令牌数
        temperature: 温度参数（0-2，越高越创意）

    Returns:
        API 生成的文本，或 None（如果失败）
    """
    if not nim_client:
        logger.error("NIM 客户端未初始化，请检查 NVIDIA_NIM_API_KEY 是否设置")
        return None

    try:
        logger.info(f"调用 NIM API - 模型: {NIM_MODEL}, max_tokens: {max_tokens}, temperature: {temperature}")

        response = nim_client.chat.completions.create(
            model=NIM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=10.0
        )

        result = response.choices[0].message.content
        logger.info(f"NIM API 调用成功，返回 {len(result)} 个字符")
        return result

    except Exception as error:
        logger.error(f"NIM API 调用失败: {type(error).__name__}")
        logger.error(f"错误详情: {str(error)}")
        import traceback
        logger.error(f"堆栈跟踪:\n{traceback.format_exc()}")
        return None
