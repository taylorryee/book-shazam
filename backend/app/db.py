from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os


# ------------------------------------------------------------
# DATABASE URL
# ------------------------------------------------------------
# We first try to read DATABASE_URL from environment variables.
# This is important for production (e.g., Render, Fly.io, Railway).
# If it does not exist, we fall back to a local development database.
#
# Format:
# postgresql+psycopg://username:password@host:port/database_name
#
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/bookshazam"
)


# ------------------------------------------------------------
# ENGINE
# ------------------------------------------------------------
# The engine is the core interface to the database.
# It manages:
# - Connection pooling
# - Sending SQL statements to Postgres
# - Low-level DB communication
#
# echo=True prints all SQL queries to the terminal.
# Useful for debugging during development.
#
engine = create_engine(DATABASE_URL, echo=True)


# ------------------------------------------------------------
# SESSION FACTORY
# ------------------------------------------------------------
# sessionmaker creates new Session objects when called.
# A Session:
# - Tracks ORM objects
# - Manages transactions
# - Executes queries
#
# autocommit=False:
#   You must explicitly call db.commit() to persist changes.
#
# autoflush=False:
#   Prevents automatic flushing of changes before queries.
#   Gives you more explicit control.
#
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ------------------------------------------------------------
# BASE CLASS FOR MODELS
# ------------------------------------------------------------
# All ORM models will inherit from this Base class.
# It registers models in SQLAlchemy's metadata system.
#
# Example:
#
# class Book(Base):
#     __tablename__ = "books"
#
class Base(DeclarativeBase):
    pass


# ------------------------------------------------------------
# FASTAPI DATABASE DEPENDENCY
# ------------------------------------------------------------
# This function provides a database session per request.
#
# FastAPI will:
# 1. Call this function when a route depends on it
# 2. Inject the yielded `db` session into the route
# 3. Automatically run the `finally` block after the request finishes
#
# This ensures:
# - Each request gets its own isolated session
# - Sessions are always properly closed
# - Connections are returned to the pool
#
# Example usage in a route:
#
# @app.get("/books")
# def get_books(db: Session = Depends(get_db)):
#     return db.query(Book).all()
#
def get_db():
    db = SessionLocal()  # Create a new session
    try:
        yield db          # Provide it to the route
    finally:
        db.close()        # Always close session after request completes
