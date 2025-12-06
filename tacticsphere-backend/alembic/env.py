from logging.config import fileConfig
import os
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Load environment variables from .env file
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Priority order for database URL:
# 1. -x dburl parameter (highest priority, for remote databases)
# 2. DATABASE_URL environment variable
# 3. sqlalchemy.url from alembic.ini (fallback)
database_url = None

# Check for -x dburl parameter (e.g., alembic upgrade head -x dburl=postgresql://...)
# Note: get_x_argument() returns a list of strings in "key=value" format
try:
    x_args_list = context.get_x_argument()
    if x_args_list:
        # Parse "key=value" format arguments into a dictionary
        x_args_dict = {}
        for arg in x_args_list:
            if '=' in arg:
                key, value = arg.split('=', 1)  # split only on first '='
                x_args_dict[key] = value
        database_url = x_args_dict.get("dburl")
except (AttributeError, TypeError):
    # get_x_argument might not be available in all Alembic versions
    # or might return None/empty
    pass

# If not provided via -x, check environment variable
if not database_url:
    database_url = os.getenv("DATABASE_URL")

# Override sqlalchemy.url if we have a database URL from any source
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = None

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
