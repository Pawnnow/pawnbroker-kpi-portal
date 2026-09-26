# Project Architecture Rules

- Budget Planner modes are isolated by `planner_mode` across cells, year settings, and category labels so Condensed and Full plans never overwrite each other.