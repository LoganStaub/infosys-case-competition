"""
Wraps calls to Groq's AI API - the shared entry point for any feature that
needs to talk to the AI (currently just the interview chatbot).

Uses Groq's official Python SDK (see requirements.txt) rather than a
generic OpenAI-compatible client, to match the team's dependency choice.
"""

import os
from groq import Groq

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ.get("GROQ_API_KEY", "not-set"))
    return _client


DEFAULT_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


def generate_chat_reply(messages, temperature=0.7, max_tokens=400):
    """Send a list of {role, content} messages to Groq, return the reply text.

    Raises RuntimeError if no API key is configured, so routes can catch
    that and turn it into a clean error response instead of a crash.
    """
    if not os.environ.get("GROQ_API_KEY"):
        raise RuntimeError(
            "No GROQ_API_KEY set. Copy .env.example to .env and add the "
            "team's Groq key."
        )
    completion = _get_client().chat.completions.create(
        model=DEFAULT_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return completion.choices[0].message.content


def generate_json_reply(messages, temperature=0.7, max_tokens=500):
    """Like generate_chat_reply, but requests Groq's JSON mode and returns
    the raw JSON string.

    Groq's JSON mode guarantees syntactically valid JSON but NOT that it
    matches any particular schema - the prompt itself has to spell out the
    exact fields wanted (see build_system_prompt). Callers should still
    parse defensively and fall back gracefully if an expected field is
    missing.
    """
    if not os.environ.get("GROQ_API_KEY"):
        raise RuntimeError(
            "No GROQ_API_KEY set. Copy .env.example to .env and add the "
            "team's Groq key."
        )
    completion = _get_client().chat.completions.create(
        model=DEFAULT_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return completion.choices[0].message.content
