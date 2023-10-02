# DailyReviewGenerator

This repo creates a website for generating daily reviews in Hive.

It does not use the schedule, Instead it provides a GUI for entering the review items.

![Example Website](docs/example.png)

## Frontend

```bash
npm start
```

## Backend

```bash
uvicorn api:app --reload --port 80 
```