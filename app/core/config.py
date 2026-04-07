import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def get_required_env(key: str) -> str:
    value = os.getenv(key, "").strip()
    if not value:
        raise ValueError(f"{key} must be set in the environment.")
    return value


@dataclass(frozen=True)
class Settings:
    qdrant_url: str
    qdrant_api_key: str
    supabase_url: str
    supabase_key: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        qdrant_url=get_required_env("QDRANT_URL"),
        qdrant_api_key=get_required_env("QDRANT_API_KEY"),
        supabase_url=get_required_env("SUPABASE_URL"),
        supabase_key=get_required_env("SUPABASE_KEY"),
    )
