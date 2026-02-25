from celery import Celery


celery = Celery(
    "tasks",
    broker="redis://redis:6379/5",#This tells Celery where your task queue lives (Redis)
    backend="redis://redis:6379/6"  # optional, for storing results
)


celery.conf.beat_schedule = {
    "check_for_uploaded_books": {
        "task": "app.utils.bookProcessing.clean_text",
        "schedule": 10.0,  #
    },
    "check_for_cleaned_books":{
        "task":"app.utils.bookProcessing.chunk_text",
        "schedule":10.0,
    },

}



from app.utils import bookProcessing