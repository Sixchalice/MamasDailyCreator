# DailyReviewGenerator

This repo creates a website for generating daily reviews in Hive.

# To Run:

set the username and password in `config.py` in the backend

## Frontend

```bash
npm start
```

## Backend

```bash
uvicorn api:app --reload --port 9000
```

# Daily feedback (מ''י) summary

`backend/misuv_summary.py` reads the students' answers to a מישוב from Hive and prints a Markdown summary:
who submitted, score stats per class, and every student's written answer (lowest score first).

```bash
cd backend
python misuv_summary.py                          # today's מישוב
python misuv_summary.py --date 21.10.2026 -o summary.md
python misuv_summary.py --date 18.10.2026 --week 3   # when a date exists in more than one week
python misuv_summary.py --list                   # list all מישוב exercises
```

`--hive` / `--course` are needed only when `config.HIVES_CONFIG` has more than one Hive or the Hive has more than one program.
