import os
import logging

log_level = os.environ.get("LOG_LEVEL", logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(log_level)

if not logger.hasHandlers():
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
