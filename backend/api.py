from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api_types import DailySubmission
from hive import HiveAPI
from questions_creator import QuestionCreator

app = FastAPI()
hive_api = HiveAPI("admin", "AdMataiHabra", "https://10.0.10.23")

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/courses")
async def get_courses():
    return hive_api.get_programs_names()


@app.post("/api/submit")
async def submit_daily(daily_data: DailySubmission):
    # Do something with the received data
    # Example: Print the data
    print("Received Data:")
    print(f"Course: {daily_data.course}")
    print(f"Date: {daily_data.selectedDate}")
    print(f"Class Reviews: {daily_data.classReviews}")
    print(f"Daily Question: {daily_data.dailyQuestion}")

    # You can process the data further or save it to a database
    question_creator = QuestionCreator(hive_api, daily_data)
    question_creator.create()
    # Return a response
    return {"message": "Data received successfully"}
