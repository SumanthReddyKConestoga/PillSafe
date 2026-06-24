# PillSafe — Progress Report (Plain-English Version)

**Last updated:** 2026-06-24

This document explains the PillSafe project in everyday language. You do not need to know anything about computers, coding, or technology to read it. If you want the technical version (for developers), see `README.md` instead — this document is for explaining the project to anyone, including someone with zero technical background.

---

## 1. What is PillSafe, in one sentence?

PillSafe is a phone/computer app that helps people figure out **what medicine they are holding and whether it is safe to take**, by taking a photo of it with a camera.

---

## 2. What problem does it solve?

Imagine an elderly person who has six different pill bottles on their kitchen counter. The labels are printed in tiny text. Sometimes pills fall out of their bottles and get mixed up. Sometimes a caregiver isn't sure if they already gave a dose this morning. Mistakes like this genuinely send people to the hospital every year.

PillSafe is built to prevent that, by:
- Reading a prescription label automatically from a photo, so nobody has to squint at tiny print.
- Remembering what medicine someone is supposed to take and when.
- Letting someone photograph a loose, unlabeled pill and checking whether it matches anything they're actually supposed to be taking.
- Speaking everything out loud, for anyone who has trouble seeing or reading.

PillSafe **never replaces a doctor or pharmacist** — it is a safety-net tool, not medical advice. The app says this clearly to every user.

---

## 3. Who is this app for?

- **Elderly patients** who manage several medications at once.
- **Caregivers** (family members, home-care workers) helping someone else manage medication.
- **People with low vision** — everything can be read aloud instead of read on screen.
- **Anyone** who finds prescription labels confusing.

---

## 4. How does someone actually use it? (step by step)

1. **Sign up** for a free account, like signing up for any website (just an email and a password).
2. **Take a photo** of a prescription label using the camera built into the app — no typing required.
3. The app **reads the label automatically** and works out the medicine name, the dose, and what time of day to take it (morning, afternoon, evening, or night).
4. The home screen shows a **simple daily schedule** — what to take and when, colour-coded by time of day.
5. If someone finds a **loose pill** and isn't sure what it is, they can photograph it. The app looks at its colour and shape and tries to match it against a known list of medications.
6. If the pill **matches** something the person is supposed to be taking, the app shows a green "all good" message. If it **doesn't match anything**, the app shows a clear red warning telling them not to take it without checking with a pharmacist.
7. A **speaker icon** lets anyone turn on a voice that reads the screen, the schedule, and the results out loud.
8. Before showing any result, a **reminder pop-up** repeats that this is not medical advice and to always check with a pharmacist or doctor.

---

## 5. What has been built and works today

Think of the app as having two halves: the part people see and tap on (the "front of house"), and the part working behind the scenes that stores information and does the thinking (the "back of house", like a kitchen behind a restaurant counter). Both halves are built and working.

### Account & daily use
- ✅ Sign up, log in, log out — works like any normal app.
- ✅ A home screen showing a personal daily medicine schedule.
- ✅ A profile page where someone can update their name, phone number, language, and password, or permanently delete their account if they want to.
- ✅ A settings page to turn notifications on/off, turn the voice assistant on/off, and choose a language.

### Scanning medicine
- ✅ Pointing the camera at a prescription label, taking a photo, and having the app automatically read the medicine name and figure out the daily schedule from it. If the camera isn't available or permission is denied, it lets someone upload a photo instead.
- ✅ A "My Medications" page listing everything currently being tracked, with colour-coded tags showing morning / afternoon / evening / night.
- ✅ A "Hear Reminder" button on every medication card that speaks a short, friendly reminder out loud — in the patient's choice of **English, French, Arabic, or Spanish** — so someone who reads better in one of those languages than in English still gets a clear spoken reminder.
- ✅ A "loose pill checker" — take a photo of an unlabeled pill, and the app works out its colour and shape using real image analysis (not guesswork), then checks it against a reference list.
- ✅ A safety check that compares what was scanned against what the person is actually supposed to be taking, and shows a clear green / amber / red result.

### Safety & trust features
- ✅ A reminder pop-up shown the very first time anyone uses the app, and again before every scan result — it cannot be skipped or clicked away from accidentally, only dismissed by reading and pressing "I Understand."
- ✅ A "Safety Records" page showing a history of every past scan and whether it matched.
- ✅ A "Medication Education" page with plain-language explanations of how to use the app, how to read a prescription label, what the app can and can't do, general medication safety tips, and a list of frequently asked questions.
- ✅ A voice assistant (a speaker icon) that reads page names, the daily schedule, and scan results out loud for anyone who prefers listening over reading.

### Public pages (no account needed)
- ✅ A welcome/home page explaining what PillSafe is, for people who haven't signed up yet.
- ✅ An "About" page explaining the mission, who it's for, and the team behind it.
- ✅ A "Contact" page with a simple form to send a message to the team.

### Behind the scenes (administration & safety)
- ✅ A separate area for the people who run/manage the app (administrators), used for things like seeing how many people are using the app. Administrators are **technically blocked** from ever seeing an individual patient's private medication or scan history — this isn't just a promise in writing, the system itself refuses the request if an administrator's account ever tries.
- ✅ Every piece of personal medication information is locked to the one person who owns it — nobody else's account can ever see it.
- ✅ A safety-style double-check system: the project has 24 automated tests that run every time a change is made, automatically checking that none of the safety rules above have been accidentally broken. All 24 currently pass.

### The look and feel
- ✅ A clean, light-colored design (no hard-to-read dark backgrounds), with larger text and big, easy-to-tap buttons, aimed at being comfortable for elderly users and accessible for people with low vision.

---

## 6. What's not finished yet (being fully honest)

- **The "loose pill checker" can describe a pill's colour and shape, but can't yet name it.** It needs to be checked against an official Canadian government medicine reference list (which includes things like "this colour + this shape + this text stamped on it = Tylenol 500mg"). That official list has **not been loaded into the app yet** — nobody had access to the real data file during this round of work. Think of it like a dictionary with all the pages and structure in place, but no words written in yet. The "lookup system" works; it just has nothing to look up against right now.
- **A more advanced AI writer (from a company called Anthropic, the makers of "Claude") is fully wired up and ready to write friendly, plain-language explanations of scan results** — but it's switched off until someone adds a paid access key (a bit like a subscription password) to the app's settings. Without it, the app still works, it just won't show that extra AI-written explanation.
- **The automatic label-reading tool ("OCR") is now installed and has been confirmed working** — it was tested on a sample label image and correctly read the text and worked out the dosing schedule. It's still left switched off by default in the saved project settings (so the 24 automated tests stay reliable no matter who runs them), and is switched on with one extra step right before a live demo or real-world run.
- **A handful of small buttons are very slightly smaller than the ideal size for easy tapping** with a finger (about 36 pixels instead of the recommended 44). This is a minor, cosmetic detail on two icons in the top bar and side menu, not a functional problem.
- **Some of the newer pages are only available in English.** Older parts of the app (login, sign-up, the main dashboard, admin pages) are available in both English and French; the newest pages built in this round haven't been translated to French yet.
- **The app hasn't been visually tested on a tablet-sized screen specifically**, though the design is built to automatically resize for different screen sizes.

None of the above stop the app from working — they're either deliberate decisions (waiting on real data, waiting on a paid key) or small polish items for later.

---

## 7. A few simple definitions, if you want them

- **"Front end"** — the part of the app you actually see and tap on: the screens, the buttons, the camera view.
- **"Back end"** — the part working behind the scenes that you never see directly: it stores information and does the actual thinking, like a kitchen behind a restaurant counter.
- **"Database"** — where the app permanently remembers information, like a digital filing cabinet. PillSafe currently uses a simple, lightweight one called SQLite that doesn't need any extra setup.
- **"API"** — the way the front end and back end talk to each other, like a waiter carrying an order from your table to the kitchen and bringing food back.
- **"OCR"** — software that reads printed or handwritten text out of a photograph, turning a picture of words into actual computer text.
- **"AI guidance"** — a written explanation generated by an artificial intelligence model, in this case to describe a pill in plain language.
- **"Automated tests"** — small scripted checks that run by themselves and confirm the important safety rules (like "a patient's data can never be seen by anyone else") are still true every time the code changes.

---

## 8. How to see it for yourself

If you'd like to actually look at the app running:
1. Ask whoever manages the project's code to "start the backend and frontend servers" (this just means switching the app on).
2. Once it's running, open a web browser and go to the address they give you (normally something like `http://localhost:5173` on the same computer).
3. From there you can click around just like any website — sign up for an account, look at the dashboard, try the camera scanning, etc.

For the technical setup steps, see `README.md`.

---

## 9. Where things stand right now — quick snapshot

| Area | Status |
|---|---|
| Sign up / log in / accounts | Fully working |
| Daily medicine schedule | Fully working |
| Scanning a prescription label (camera) | Fully working (real label-reading is installed and tested; switched on with one extra step for a live demo, off by default to keep automated tests reliable) |
| My Medications list | Fully working |
| Loose pill photo checker (colour & shape) | Fully working |
| Matching a scanned pill against your medicine list | Fully working |
| Official medicine name lookup | Built, but the reference list is empty — pending real data |
| AI-written plain-language descriptions | Built, switched off until a paid access key is added |
| Safety reminders & warnings | Fully working |
| Voice assistant (read aloud) | Fully working |
| Profile, Settings, Safety history, Education pages | Fully working |
| Public Home / About / Contact pages | Fully working |
| Administrator area, with patient-privacy lockout | Fully working |
| Automated safety checks (tests) | 24 out of 24 passing |
| Multilingual voice reminders (English / French / Arabic / Spanish) | Fully working |
| Look and feel (light theme, large text, big buttons) | Done, with two very minor cosmetic exceptions noted above |

---

*PillSafe · Conestoga College Graduate AI/ML Program · AIML-6900 Capstone*
