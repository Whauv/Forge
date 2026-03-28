import os

from dotenv import load_dotenv

load_dotenv()


def get_required_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise ValueError(f"{key} must be set in the environment.")
    return value

