import config
from api_types import ClassReview, DailySubmission
from config import REVIEW_TYPE_TO_QUESTIONS
from hive import HiveAPI


class MisuvCreator():
    def __init__(self, hive_api: HiveAPI, daily_submission: DailySubmission):
        self.hive_api = hive_api
        self.daily_submission = daily_submission

    def create(self):
        program_id = self.hive_api.get_program_id_by_name(self.daily_submission.course)
        subject_id = self.hive_api.get_subject_id_in_program(config.MISUV_SUBJECT_SYMBOL, self.daily_submission.course)
        if not subject_id:
            subject_id = self.hive_api.create_subject(program_id, config.MISUV_SUBJECT_SYMBOL,
                                                      config.MISUV_SUBJECT_NAME, "#ffeb3b").json()["id"]
        module_id = self.hive_api.get_module_id(subject_id, config.MISUV_MODULE_NAME)
        if not module_id:
            response = self.hive_api.create_module(subject_id, config.MISUV_MODULE_NAME, "01", False)
            assert response.ok, "Module creation failed"
            module_id = response.json()['id']
        module_exercises = self.hive_api.get_all_exercises_im_module(module_id)
        module_order = 1
        if len(module_exercises) > 0:
            module_order = int(max(self.hive_api.get_all_exercises_im_module(module_id),
                                   key=lambda exercise: int(exercise['order']))["order"]) + 1
        exercise = self.hive_api.create_exercise(module_id, self.daily_submission.selectedDate.strftime("%d.%m.%Y"),
                                                 module_order,
                                                 download=False, preview=False).json()
        exercise_id = exercise["id"]
        self.create_questions(exercise_id)

        queue_id = self.hive_api.get_queue_id(config.MISUV_MODULE_NAME, module_id)
        if not queue_id:
            queue_id = self.hive_api.create_new_queue(config.MISUV_MODULE_NAME, module_id).json()["id"]
        self.hive_api.add_exercise_to_queue(exercise_id, queue_id)

        # Returning the url for the exercise
        return f"course/{program_id}/{subject_id}/{module_id}/{exercise_id}"

    def create_questions(self, exercise_id):
        self.delete_existing_fields(exercise_id)

        self.add_separator_field(exercise_id)
        for event in self.daily_submission.classReviews:
            self.add_questions_for_event(event, exercise_id)

        if self.daily_submission.dailyQuestion:
            self.hive_api.create_field(exercise_id, "השאלה היומית", has_value=False, segel_only=False)
            self.hive_api.create_field(exercise_id, f"{self.daily_submission.dailyQuestion}", type="text",
                                       segel_only=False)
            self.add_separator_field(exercise_id)

        self.hive_api.create_field(exercise_id, f"הערות כלליות לגבי היום", has_value=False, segel_only=False)
        self.hive_api.create_field(exercise_id, "הערות כלליות", type="text", segel_only=False)

    def delete_existing_fields(self, exercise_id):
        fields = self.hive_api.get_all_fields_of_exercise(exercise_id)
        for field_id in fields:
            self.hive_api.delete_field(exercise_id, field_id)

    def add_questions_for_event(self, review: ClassReview, exercise_id):
        questions = REVIEW_TYPE_TO_QUESTIONS[review.type]
        self.hive_api.create_field(exercise_id, f"{review.type} - {review.title}", has_value=False, segel_only=False)
        for question in questions:
            self.hive_api.create_field(exercise_id, question, type="number", lower_limit=1, upper_limit=5,
                                       segel_only=False)
        self.hive_api.create_field(exercise_id, "נמק את תשובתייך", type="text", segel_only=False)
        self.add_separator_field(exercise_id)

    def add_separator_field(self, exercise_id):
        self.hive_api.create_field(exercise_id,
                                   f"==================================================================================",
                                   has_value=False, segel_only=False)
