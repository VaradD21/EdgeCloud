from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "peercloud_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.billing_worker", "app.worker.heartbeat_checker", "app.worker.rating_updater"]
)

celery_app.conf.task_routes = {
    "app.worker.*": {"queue": "main-queue"}
}

celery_app.conf.beat_schedule = {
    "process-billing-every-minute": {
        "task": "app.worker.billing_worker.process_billing",
        "schedule": crontab(minute="*"),
    },
    "check-heartbeats-every-minute": {
        "task": "app.worker.heartbeat_checker.check_heartbeats",
        "schedule": crontab(minute="*"),
    },
    "update-ratings-daily": {
        "task": "app.worker.rating_updater.update_ratings",
        "schedule": crontab(hour="0", minute="0"),
    }
}
