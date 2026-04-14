from questions_config import EXERCISE_QUESTIONS, LECTURE_QUESTIONS, PERSONAL_LEARN_QUESTIONS, \
    PHYSICAL_TRAINING_QUESTIONS

REVIEW_TYPE_TO_QUESTIONS = {
    'ע"ע': EXERCISE_QUESTIONS,
    'הרצאה': LECTURE_QUESTIONS,
    'ל"ע': PERSONAL_LEARN_QUESTIONS,
    'א"ג': PHYSICAL_TRAINING_QUESTIONS,
}

HIVES_CONFIG = {
    "noam-hive": {
        "username": "admin",
        "password": "admin",
        "url": "https://ec2-44-199-203-15.compute-1.amazonaws.com"
    }
}

MISUV_SUBJECT_SYMBOL = "M"
MISUV_SUBJECT_NAME = "מישוב"
# Week-based modules: one module per week. Hive `order` = week index (1..WEEK_MODULE_COUNT).
WEEK_MODULE_COUNT = 60
# Display name for each module in Hive (week number is {0}).
MISUV_WEEK_MODULE_LABEL_TEMPLATE = "שבוע {}"
