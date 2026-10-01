from __future__ import annotations
from typing import Dict

SUPPORTED_LANGS = ("uk", "ru", "en")

TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "uk": {
        "app_name": "StreamPulse",
        "dashboard": "Огляд",
        "telegram": "Telegram Боти",
        "discord": "Discord Сервери",
        "youtube": "YouTube Канали",
        "vault": "Системний Vault",
        "tasks": "Конструктор задач",
        "search": "Пошук по сервісам...",
        "connected": "Підключено сервісів",
        "active_tasks": "Активних задач",
        "live_feed": "Live Activity Feed",
        "open_panel": "Відкрити панель",
        "back": "Назад до інтеграцій",
        "run_async": "Запустити задачу асинхронно",
        "history": "Історія запусків",
        "login": "Вхід",
        "register": "Реєстрація",
        "logout": "Вийти",
        "light": "Світла",
        "dark": "Темна",
    },
    "ru": {
        "app_name": "StreamPulse",
        "dashboard": "Обзор",
        "telegram": "Telegram Боты",
        "discord": "Discord Серверы",
        "youtube": "YouTube Каналы",
        "vault": "Системный Vault",
        "tasks": "Конструктор задач",
        "search": "Поиск по сервисам...",
        "connected": "Подключено сервисов",
        "active_tasks": "Активных задач",
        "live_feed": "Live Activity Feed",
        "open_panel": "Открыть панель",
        "back": "Назад к интеграциям",
        "run_async": "Запустить задачу асинхронно",
        "history": "История запусков",
        "login": "Вход",
        "register": "Регистрация",
        "logout": "Выйти",
        "light": "Светлая",
        "dark": "Тёмная",
    },
    "en": {
        "app_name": "StreamPulse",
        "dashboard": "Overview",
        "telegram": "Telegram Bots",
        "discord": "Discord Servers",
        "youtube": "YouTube Channels",
        "vault": "System Vault",
        "tasks": "Task Builder",
        "search": "Search services...",
        "connected": "Connected services",
        "active_tasks": "Active tasks",
        "live_feed": "Live Activity Feed",
        "open_panel": "Open panel",
        "back": "Back to integrations",
        "run_async": "Run task async",
        "history": "Run history",
        "login": "Login",
        "register": "Register",
        "logout": "Logout",
        "light": "Light",
        "dark": "Dark",
    },
}


def get_text(lang: str, key: str) -> str:
    if lang not in SUPPORTED_LANGS:
        lang = "uk"
    return TRANSLATIONS[lang].get(key, TRANSLATIONS["en"].get(key, key))
