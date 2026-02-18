from celery import Celery


celery = Celery(
    "tasks",
    broker="redis://redis:6379/5",#This tells Celery where your task queue lives (Redis)
    backend="redis://redis:6379/6"  # optional, for storing results
)

from app.utils import bookProcessing