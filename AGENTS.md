# Project Architecture Rules

- Budget Planner modes are isolated by `planner_mode` across cells, year settings, and category labels so Condensed and Full plans never overwrite each other.
- PawnMate custom upload labels are isolated by `planner_mode`, while shared KPI values stay compatible across planner views.