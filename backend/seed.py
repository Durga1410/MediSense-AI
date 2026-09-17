"""MediSense AI seed data — SYNTHETIC demo patients/assessments only.

Run: cd /app/backend && python seed.py
Rebuilds the demo dataset (drops the app collections, re-applies indexes, inserts).
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes

random.seed(42)  # reproducible demo data

FIRST = ["Sarah", "Marcus", "Elena", "Robert", "Priya", "James", "Aisha", "Daniel", "Mei", "Omar",
         "Grace", "Liam", "Nadia", "Ethan", "Sofia", "Carlos", "Hannah", "Kenji", "Lucia", "Noah",
         "Amara", "Felix", "Ivy", "Diego", "Zara", "Peter", "Rosa", "Victor", "Naomi", "Adam",
         "Leila", "Tom", "Ines", "Ravi", "Emma", "Jonas", "Mila", "Andre", "Tara", "Yusuf"]
LAST = ["Jenkins", "Vance", "Rostova", "Chen", "Sharma", "O'Connor", "Khan", "Reyes", "Tanaka", "Haddad",
        "Okafor", "Byrne", "Aziz", "Walsh", "Marino", "Silva", "Kim", "Sato", "Moreau", "Andersson",
        "Diallo", "Berger", "Novak", "Ortega", "Aziz", "Novak", "Ionescu", "Lindberg", "Costa", "Bauer",
        "Haddad", "Fischer", "Duarte", "Iyer", "Watson", "Berg", "Kowalski", "Dubois", "Singh", "Farah"]

DEPARTMENTS = [
    ("General Medicine", "Primary evaluation and first-line triage for adult conditions",
     ["fever", "fatigue", "body aches", "general malaise"]),
    ("Cardiology", "Heart and vascular system care",
     ["chest pain", "palpitations", "shortness of breath", "swelling in legs"]),
    ("Pulmonology", "Lungs and respiratory system care",
     ["breathing difficulty", "wheezing", "persistent cough", "chest tightness"]),
    ("Neurology", "Brain, spine and nervous system care",
     ["headache", "dizziness", "numbness", "seizures"]),
    ("Gastroenterology", "Digestive system care",
     ["abdominal pain", "nausea", "heartburn", "changes in bowel habit"]),
    ("Orthopedics", "Bones, joints and musculoskeletal care",
     ["joint pain", "back pain", "sprains", "limited mobility"]),
    ("Dermatology", "Skin, hair and nail care",
     ["rash", "itching", "skin lesions", "persistent acne"]),
    ("ENT", "Ear, nose and throat care",
     ["sore throat", "ear pain", "hearing loss", "sinus congestion"]),
    ("Pediatrics", "Medical care for infants, children and teens",
     ["fever in children", "rash", "cough", "growth concerns"]),
    ("Gynecology", "Women's reproductive health care",
     ["pelvic pain", "menstrual concerns", "pregnancy questions"]),
    ("Emergency Care", "Immediate evaluation of emergencies",
     ["crushing chest pain", "severe breathing difficulty", "stroke signs", "heavy bleeding"]),
    ("Internal Medicine", "Complex adult conditions and chronic disease management",
     ["chronic disease monitoring", "multi-system symptoms", "unexplained weight loss"]),
]

DOCTOR_FIRST = ["Amelia", "Raj", "Sofia", "David", "Leena", "Marcus", "Ingrid", "Hiro", "Carmen", "Paul",
                "Nina", "Omar", "Julia", "Samir", "Beth", "Carlos"]
DOCTOR_LAST = ["Patel", "Nair", "Rossi", "Cohen", "Menon", "Webb", "Larsen", "Tan", "Reyes", "Grant",
               "Roy", "Farouk", "Svensson", "Kapoor", "Osei", "Mendez"]

SYMPTOMS = [
    # (name, category, red_flag)
    ("chest discomfort", "Cardiovascular", True), ("palpitations", "Cardiovascular", False),
    ("shortness of breath", "Respiratory", True), ("wheezing", "Respiratory", False),
    ("persistent cough", "Respiratory", False), ("chest tightness", "Respiratory", True),
    ("headache", "Neurological", False), ("dizziness", "Neurological", False),
    ("numbness", "Neurological", True), ("slurred speech", "Neurological", True),
    ("abdominal pain", "Gastrointestinal", False), ("nausea", "Gastrointestinal", False),
    ("vomiting", "Gastrointestinal", False), ("blood in stool", "Gastrointestinal", True),
    ("back pain", "Musculoskeletal", False), ("joint pain", "Musculoskeletal", False),
    ("rash", "Dermatological", False), ("itching", "Dermatological", False),
    ("hives", "Dermatological", False), ("sore throat", "ENT", False),
    ("ear pain", "ENT", False), ("hearing loss", "ENT", False),
    ("fever", "General Medicine", False), ("fatigue", "General Medicine", False),
    ("body aches", "General Medicine", False), ("chills", "General Medicine", False),
]

CATEGORY_TO_DEPT = {
    "Cardiovascular": "Cardiology", "Respiratory": "Pulmonology", "Neurological": "Neurology",
    "Gastrointestinal": "Gastroenterology", "Musculoskeletal": "Orthopedics",
    "Dermatological": "Dermatology", "ENT": "ENT", "General Medicine": "General Medicine",
    "Pediatrics": "Pediatrics", "Women's Health": "Gynecology", "Emergency": "Emergency Care",
}

RISK_CATEGORY = {
    "LOW": ["Neurological", "ENT", "Dermatological", "General Medicine", "Musculoskeletal"],
    "MEDIUM": ["General Medicine", "Respiratory", "Gastrointestinal", "Neurological", "ENT"],
    "HIGH": ["Respiratory", "Cardiovascular", "Neurological", "Gastrointestinal"],
    "CRITICAL": ["Cardiovascular", "Respiratory", "Neurological"],
}

RISK_FACTORS_BY_LEVEL = {
    "LOW": ["Mild symptom intensity", "No red-flag signs", "Identifiable benign trigger"],
    "MEDIUM": ["Symptoms persisting beyond 72 hours", "Moderate symptom intensity", "Multi-system involvement"],
    "HIGH": ["Red-flag symptom present", "Sudden onset", "Age over 60", "Relevant patient history"],
    "CRITICAL": ["Emergency warning pattern", "Severe symptom intensity", "Acute dyspnea with autonomic signs"],
}

LEVEL_GUIDANCE = {
    "LOW": "Monitor your symptoms and consider a routine consultation with the recommended department if they persist beyond a few days or worsen.",
    "MEDIUM": "Consider scheduling a consultation with the recommended department within the next 24-48 hours. Rest, stay hydrated, and keep monitoring your symptoms.",
    "HIGH": "Seek prompt medical evaluation today - an urgent care visit or same-day consultation with the recommended department is advised.",
    "CRITICAL": "Seek immediate professional/emergency medical care. Contact your local emergency services right away - do not delay.",
}


def rand_name() -> str:
    return f"{random.choice(FIRST)} {random.choice(LAST)}"


def make_transcript(primary: str, duration: str, severity: str, age: int, conditions: list[str]) -> list[dict]:
    t = [
        {"role": "user", "content": f"I've been experiencing {primary} for {duration}."},
        {"role": "assistant", "content": "Thanks for sharing. How severe is it - mild, moderate, or severe?"},
        {"role": "user", "content": f"I'd say {severity}. I'm {age} years old."},
        {"role": "assistant", "content": "Understood. Do you have any existing medical conditions or medications?"},
        {"role": "user", "content": ", ".join(conditions) if conditions else "None that I know of."},
        {"role": "assistant", "content": "Thank you - I have enough information for a preliminary assessment."},
    ]
    return t


async def main() -> None:
    print("Dropping demo collections ...")
    for name in ["patients", "assessments", "departments", "doctors", "symptoms",
                 "assessment_symptoms", "human_reviews", "conversations", "settings",
                 "status_checks"]:
        await db[name].drop()
    await ensure_indexes()

    now = datetime.now(timezone.utc)

    # --- departments + doctors ---
    dept_docs = []
    for name, spec, common in DEPARTMENTS:
        dept_docs.append({
            "id": f"dept-{name.lower().replace(' ', '-')}",
            "name": name, "specialization": spec, "description": spec,
            "common_symptoms": common, "created_at": now,
        })
    await db.departments.insert_many(dept_docs)

    doctor_docs = []
    for d in dept_docs:
        for i in range(2):
            doctor_docs.append({
                "id": f"doc-{d['name'].lower().replace(' ', '-')}-{i}",
                "name": f"Dr. {random.choice(DOCTOR_FIRST)} {random.choice(DOCTOR_LAST)}",
                "department_id": d["id"], "department_name": d["name"],
                "specialty": d["specialization"], "created_at": now,
            })
    await db.doctors.insert_many(doctor_docs)

    # --- symptom catalog ---
    symptom_docs = [{
        "id": f"sym-{i:02d}", "name": n, "category": c, "red_flag": r, "created_at": now,
    } for i, (n, c, r) in enumerate(SYMPTOMS)]
    await db.symptoms.insert_many(symptom_docs)

    # --- patients ---
    patient_docs = []
    for i in range(40):
        name = rand_name()
        patient_docs.append({
            "id": f"pat-{i:03d}",
            "patient_code": f"PT-{1001 + i:04d}",
            "name": name,
            "age": random.randint(18, 82),
            "gender": random.choice(["female", "male"]),
            "status": random.choice(["Active", "Active", "Active", "Monitoring"]),
            "created_at": now - timedelta(days=random.randint(5, 40)),
        })
    await db.patients.insert_many(patient_docs)

    # --- assessments: 128 spread over 14 days (54/39/25/10 by risk) ---
    plan = [("LOW", 54), ("MEDIUM", 39), ("HIGH", 25), ("CRITICAL", 10)]
    assessment_docs: list[dict] = []
    asmt_link_docs: list[dict] = []
    review_specs: list[dict] = []

    asmt_index = 0
    for level, n in plan:
        for _ in range(n):
            patient = random.choice(patient_docs)
            category = random.choice(RISK_CATEGORY[level])
            department = CATEGORY_TO_DEPT.get(category, "General Medicine")
            if level == "CRITICAL":
                department = "Emergency Care"

            days_ago = int(random.triangular(0, 13) ** 1.25)  # bias toward recent days
            created = (now - timedelta(days=days_ago, hours=random.randint(0, 12),
                                       minutes=random.randint(0, 59)))
            score = {"LOW": random.randint(8, 29), "MEDIUM": random.randint(30, 59),
                     "HIGH": random.randint(60, 84), "CRITICAL": random.randint(85, 99)}[level]
            confidence = {"LOW": random.randint(78, 96), "MEDIUM": random.randint(72, 93),
                          "HIGH": random.randint(80, 95), "CRITICAL": random.randint(88, 98)}[level]
            if level == "MEDIUM" and random.random() < 0.12:
                confidence = random.randint(48, 58)  # low-confidence cases escalate too

            primary_pool = [s for s, c, r in SYMPTOMS if c == category]
            primary = random.sample(primary_pool, k=min(2, len(primary_pool)))
            secondary_pool = [s for s, c, r in SYMPTOMS if c != category and not r]
            secondary = random.sample(secondary_pool, k=random.randint(0, 2))
            severity = {"LOW": "mild", "MEDIUM": "moderate", "HIGH": "severe", "CRITICAL": "severe"}[level]
            duration = random.choice(["1 day", "2 days", "3 days", "4 days", "5 hours", "a week"])
            onset = random.choice(["gradual", "sudden", "gradual"])
            conditions = random.choice([[], [], ["Hypertension"], ["Diabetes"], ["Asthma"], ["High cholesterol"]])
            meds = ["Amlodipine"] if "Hypertension" in conditions else []

            asmt_index += 1
            asmt_id = f"asmt-{asmt_index:04d}"
            emergency = [primary[0] + " with autonomic signs"] if level == "CRITICAL" else []
            escalation = level in ("HIGH", "CRITICAL") or confidence < 60
            reasons = []
            if level in ("HIGH", "CRITICAL"):
                reasons.append(f"{level} risk level flagged for clinician review")
            if confidence < 60:
                reasons.append(f"AI confidence {confidence}% is below the review threshold (60%)")

            doc = {
                "id": asmt_id,
                "assessment_code": f"AS-{1001 + asmt_index:04d}",
                "patient_id": patient["id"],
                "patient_name": patient["name"],
                "age": patient["age"],
                "gender": patient["gender"],
                "primary_symptoms": primary,
                "secondary_symptoms": secondary,
                "duration": duration,
                "severity": severity,
                "onset": onset,
                "existing_conditions": conditions,
                "medications": meds,
                "risk_factors": [f for f in RISK_FACTORS_BY_LEVEL[level] if random.random() < 0.7] or ["Symptom pattern match"],
                "emergency_indicators": emergency,
                "risk_level": level,
                "risk_score": score,
                "confidence": confidence,
                "possible_category": category if level != "CRITICAL" else f"Cardiovascular - possible acute coronary pattern",
                "contributing_factors": [
                    {"factor": f, "impact": {"mild": 8, "moderate": 20, "severe": 35}.get(severity, 12) if "intensity" in f else 12,
                     "detail": "Identified during AI triage conversation."}
                    for f in RISK_FACTORS_BY_LEVEL[level]
                ],
                "recommended_department": department,
                "department_reason": f"Symptoms involve the {category.lower()} system." if department != "Emergency Care"
                                     else "Emergency warning indicators detected - immediate professional evaluation required.",
                "guidance": LEVEL_GUIDANCE[level],
                "escalation_required": escalation,
                "escalation_reason": " | ".join(reasons),
                "review_status": "pending" if escalation else "not_required",
                "transcript": make_transcript(primary[0] if primary else "discomfort", duration, severity, patient["age"], conditions),
                "ai_engine": "seeded demo generator",
                "scenario": None,
                "created_at": created,
            }
            assessment_docs.append(doc)

            for s in primary + secondary:
                asmt_link_docs.append({"id": f"link-{asmt_id}-{s.replace(' ', '-')[:20]}",
                                       "assessment_id": asmt_id, "symptom_name": s, "created_at": created})

            if escalation:
                review_specs.append({
                    "assessment_id": asmt_id, "assessment_code": doc["assessment_code"],
                    "patient_id": patient["id"], "patient_name": patient["name"],
                    "risk_level": level, "confidence": confidence,
                    "reason": " | ".join(reasons), "created_at": created,
                })

    await db.assessments.insert_many(assessment_docs)
    if asmt_link_docs:
        await db.assessment_symptoms.insert_many(asmt_link_docs)

    # --- human reviews: cap at 21 (all critical + subset of high + low-confidence mediums) ---
    review_specs.sort(key=lambda r: (r["risk_level"] != "CRITICAL", r["risk_level"] != "HIGH"))
    review_docs = []
    for i, spec in enumerate(review_specs[:21]):
        reviewed = i % 3 != 0  # ~2/3 already reviewed
        review_docs.append({
            "id": f"rev-{i:03d}",
            **spec,
            "status": "reviewed" if reviewed else "pending",
            "reviewed_at": spec["created_at"] + timedelta(hours=random.randint(1, 20)) if reviewed else None,
            "reviewer_notes": "Clinician confirmed AI risk classification." if reviewed else "",
        })
    await db.human_reviews.insert_many(review_docs)

    # --- refresh patient last-assessment snapshots ---
    for patient in patient_docs:
        theirs = [a for a in assessment_docs if a["patient_id"] == patient["id"]]
        if not theirs:
            continue
        latest = max(theirs, key=lambda a: a["created_at"])
        await db.patients.update_one(
            {"id": patient["id"]},
            {"$set": {"last_assessment": latest["created_at"].strftime("%Y-%m-%d"),
                      "risk_level": latest["risk_level"],
                      "department": latest["recommended_department"]}},
        )

    # --- settings baseline ---
    await db.settings.update_one(
        {"key": "app"},
        {"$set": {"thresholds": {"medium_min": 30, "high_min": 60, "critical_min": 85,
                                 "confidence_review_threshold": 60},
                  "n8n_webhook_url": ""}},
        upsert=True,
    )

    print(f"Seeded: {len(dept_docs)} departments, {len(doctor_docs)} doctors, "
          f"{len(patient_docs)} patients, {len(assessment_docs)} assessments, "
          f"{len(review_docs)} human reviews ({sum(1 for r in review_docs if r['status'] == 'pending')} pending).")


if __name__ == "__main__":
    asyncio.run(main())
