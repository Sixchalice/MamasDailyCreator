"""
Summarize the students' answers to a daily מישוב (מ''י) exercise in Hive.

Usage (from backend/):
    python misuv_summary.py                       # today's מישוב
    python misuv_summary.py --date 21.10.2026
    python misuv_summary.py --date 18.10.2026 --week 3
    python misuv_summary.py --list                # list all מישוב exercises
    python misuv_summary.py --date 21.10.2026 -o summary.md
"""
import argparse
import statistics
import sys
from collections import Counter
from datetime import date, datetime

import config
from hive import HiveAPI

DATE_FORMAT = "%d.%m.%Y"
DAILY_QUESTION_HEADER = "השאלה היומית"


def parse_date(value):
    for fmt in (DATE_FORMAT, "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    raise argparse.ArgumentTypeError(f"bad date {value!r}, expected dd.mm.yyyy")


def pick(options, chosen, what):
    """Return `chosen`, or the only option when none was chosen."""
    if chosen:
        if chosen not in options:
            sys.exit(f"Unknown {what} {chosen!r}. Options: {', '.join(options)}")
        return chosen
    if len(options) != 1:
        sys.exit(f"Pass --{what}. Options: {', '.join(options)}")
    return options[0]


def module_week(module):
    try:
        return int(module["order"])
    except (KeyError, TypeError, ValueError):
        return None


def list_misuv_exercises(hive_api, course):
    """Yield (week, module, exercise) for every exercise in the מישוב subject, by week."""
    subject_id = hive_api.get_subject_id_in_program(config.MISUV_SUBJECT_SYMBOL, course)
    if not subject_id:
        sys.exit(f"No {config.MISUV_SUBJECT_NAME} subject in {course}")
    modules = sorted(hive_api.get_modules_of_subject(subject_id), key=lambda m: module_week(m) or 0)
    for module in modules:
        exercises = hive_api.get_all_exercises_im_module(module["id"])
        for exercise in sorted(exercises, key=lambda e: int(e["order"])):
            yield module_week(module), module, exercise


def find_exercise(hive_api, course, day, week):
    name = day.strftime(DATE_FORMAT)
    matches = [(w, m, e) for w, m, e in list_misuv_exercises(hive_api, course)
               if e["name"] == name and (week is None or w == week)]
    if not matches:
        sys.exit(f"No מישוב named {name}" + (f" in week {week}" if week else "") + " (try --list)")
    if len(matches) > 1:
        weeks = ", ".join(str(w) for w, _, _ in matches)
        sys.exit(f"{name} exists in several weeks ({weeks}); pass --week")
    return matches[0]


def split_sections(fields):
    """
    Group exercise fields into sections, following the layout MisuvCreator builds:
    a header field (has_value=False) per class / daily question, then its answer fields.
    The share question has no header, so it gets its own section.
    """
    sections = []
    for field in sorted(fields, key=lambda f: f["order"]):
        if not field["has_value"]:
            sections.append({"title": field["name"], "fields": []})
        elif field["name"] == config.SHARE_QUESTION_TEXT or not sections:
            sections.append({"title": field["name"], "fields": [field]})
        else:
            sections[-1]["fields"].append(field)
    return [s for s in sections if s["fields"]]


def latest_submission(responses, user_id):
    submissions = [r for r in responses if r.get("response_type") == "Submission" and r.get("user") == user_id]
    return max(submissions, key=lambda r: r["date"]) if submissions else None


def is_meaningful(text):
    # Required text fields get filled with "." or "/" just to submit.
    return any(ch.isalnum() for ch in text)


def to_number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def fmt_number(value):
    return str(int(value)) if value == int(value) else f"{value:.1f}"


def full_name(user):
    name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    return name or user.get("display_name") or user.get("username") or f"user {user['id']}"


def collect_answers(hive_api, exercise_id):
    """Return ({user_id: {field_id: content}}, [names of students who did not submit])."""
    users = {u["id"]: u for u in hive_api.get_users()}
    answers, missing = {}, []
    for assignment in hive_api.get_exercise_assignments(exercise_id):
        user = users.get(assignment["user"], {"id": assignment["user"]})
        submission = latest_submission(hive_api.get_assignment_responses(assignment["id"]), assignment["user"])
        if submission is None:
            missing.append(full_name(user))
            continue
        answers[full_name(user)] = {c["field"]: c["content"] for c in submission["contents"]}
    return answers, sorted(missing)


def score_line(field, values):
    if not values:
        return f"**{field['name']}**: אין תשובות"
    distribution = ", ".join(f"{fmt_number(v)}×{n}" for v, n in sorted(Counter(values).items(), reverse=True))
    return (f"**{field['name']}**: ממוצע {statistics.mean(values):.2f} · "
            f"חציון {fmt_number(statistics.median(values))} · "
            f"טווח {fmt_number(min(values))}–{fmt_number(max(values))} · "
            f"{len(values)} תשובות  \n"
            f"התפלגות: {distribution}")


def summarize_section(section, answers):
    number_fields = [f for f in section["fields"] if f["type"] == "number"]
    text_fields = [f for f in section["fields"] if f["type"] != "number"]
    lines = [f"## {section['title']}", ""]

    for field in number_fields:
        values = [v for a in answers.values() if (v := to_number(a.get(field["id"]))) is not None]
        lines += [score_line(field, values), ""]

    # One line per student, lowest score first, so problems show up on top.
    rows = []
    for name, answer in answers.items():
        scores = [to_number(answer.get(f["id"])) for f in number_fields]
        texts = [(f, answer.get(f["id"], "").strip()) for f in text_fields]
        # Keep multi-line answers on one Markdown list line.
        texts = [(f, " / ".join(line.strip() for line in t.splitlines() if line.strip()))
                 for f, t in texts if is_meaningful(t)]
        if not texts:
            continue
        sort_key = min((s for s in scores if s is not None), default=float("inf"))
        score_text = " / ".join(fmt_number(s) if s is not None else "-" for s in scores)
        for i, (field, text) in enumerate(texts):
            label = f"**{name}**" + (f" ({score_text})" if score_text else "")
            if len(text_fields) > 1:
                label += f" — {field['name']}"
            rows.append((sort_key, name, i, f"- {label}: {text}"))

    if rows:
        lines += [row for *_, row in sorted(rows)]
    else:
        lines.append("_אין תשובות מילוליות_")
    lines.append("")
    return lines


def build_report(course, week, exercise, sections, answers, missing):
    total = len(answers) + len(missing)
    lines = [
        f"# סיכום {config.MISUV_SUBJECT_NAME} — {exercise['name']} (שבוע {week}, {course})",
        "",
        f"הגישו: {len(answers)}/{total}",
    ]
    if missing:
        lines.append(f"לא הגישו: {', '.join(missing)}")
    lines.append("")
    for section in sections:
        lines += summarize_section(section, answers)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Summarize a daily מישוב from Hive")
    parser.add_argument("--hive", help="Hive name from config.HIVES_CONFIG")
    parser.add_argument("--course", help="Hive program name")
    parser.add_argument("--date", type=parse_date, default=date.today(), help="dd.mm.yyyy (default: today)")
    parser.add_argument("--week", type=int, help="week number, needed when a date exists in several weeks")
    parser.add_argument("--list", action="store_true", help="list the מישוב exercises and exit")
    parser.add_argument("-o", "--output", help="write the Markdown report to this file")
    args = parser.parse_args()

    hive_name = pick(list(config.HIVES_CONFIG), args.hive, "hive")
    hive_config = config.HIVES_CONFIG[hive_name]
    hive_api = HiveAPI(hive_config["username"], hive_config["password"], hive_config["url"])
    if not hive_api.token:
        sys.exit(f"Could not log in to {hive_config['url']}")
    course = pick(hive_api.get_programs_names(), args.course, "course")

    if args.list:
        for week, module, exercise in list_misuv_exercises(hive_api, course):
            print(f"week {week}\t{exercise['name']}\t(exercise {exercise['id']})")
        return

    week, _, exercise = find_exercise(hive_api, course, args.date, args.week)
    sections = split_sections(hive_api.retrieve_exercise_fields_by_id(exercise["id"]))
    answers, missing = collect_answers(hive_api, exercise["id"])
    report = build_report(course, week, exercise, sections, answers, missing)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report + "\n")
        print(f"Wrote {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
