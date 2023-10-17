from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from api_types import DailySubmission
from hive import HiveAPI
from misuv_creator import MisuvCreator

app = FastAPI()
hives_api = {hive_name: HiveAPI(hive_config.get("username"), hive_config.get("password"), hive_config.get("url")) for
             hive_name, hive_config in config.HIVES_CONFIG.items()}

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/courses")
async def get_courses():
    courses = []
    for hive_name, hive_api in hives_api.items():
        programs = hive_api.get_programs_names()
        for program in programs:
            courses.append(f"{hive_name}:{program}")
    return courses


@app.get("/api/reviewTypes")
async def get_review_types():
    return list(config.REVIEW_TYPE_TO_QUESTIONS.keys())


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
    hive_name, course = daily_data.course.split(":")
    daily_data.course = course
    hive_api = hives_api.get(hive_name)
    misuv_creator = MisuvCreator(hive_api, daily_data)
    url = misuv_creator.create()
    exercise_url = f"{hive_api.hive_host}/{url}"
    # Return a response
    return {"message": f"קישור למישוב {exercise_url}"}
