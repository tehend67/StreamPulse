from __future__ import annotations
from celery import Celery
from app.config import settings

redis_url = settings.redis_url.strip() if settings.redis_url else ""
local_mode = redis_url in ("", "memory://", "disabled")

if local_mode:
    celery = Celery("streampulse", broker="memory://", backend="cache+memory://")
else:
    celery = Celery("streampulse", broker=redis_url, backend=redis_url)
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=not local_mode,
    worker_prefetch_multiplier=1,
    task_default_queue="streampulse",
    beat_schedule={
        "periodic-status-refresh": {
            "task": "streampulse.periodic_refresh",
            "schedule": 300.0,
        }
    },
    task_always_eager=local_mode,
    task_eager_propagates=local_mode,
)

import app.worker.tasks  # noqa: F401,E402
