from datetime import datetime, timezone, timedelta

def get_eat_time() -> datetime:
    """Returns the current date and time in East Africa Time (EAT, UTC+3) as a naive datetime object."""
    eat_tz = timezone(timedelta(hours=3))
    return datetime.now(eat_tz).replace(tzinfo=None)
