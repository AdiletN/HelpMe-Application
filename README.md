# HelpMe — Students helping students

A complete local demonstration of a student-to-student peer-learning platform, developed from the 19-page system diagrams in `Who_Can_Help_System_Diagrams.pdf` (formerly **Who Can Help?**).

## Quick start (Windows 11 / macOS / Linux)

**Requirements:** Node.js 20 or 22 LTS and npm. Native SQLite dependencies require a supported Node.js release. Internet access is required **the first time** npm downloads packages.

```bash
npm install
npm run demo
npm start
```

On Windows, you can also double-click `RUN_DEMO_WINDOWS.bat` for a prepared presentation (or `RUN_WINDOWS.bat` after installation).

Open **http://localhost:3000**. For development, use `npm run dev` instead of `npm start`.

**Demo accounts (local demonstration only):**

| Student | Email | Password | Specialization |
|---|---|---|---|
| Adilet (asks for help) | `adilet@demo.edu` | `Demo1234!` | Computer Science |
| Arman (helps with Recursion and SQL JOIN) | `arman@demo.edu` | `Demo1234!` | Computer Science |
| Aigerim (helps with Sorting) | `aigerim@demo.edu` | `Demo1234!` | Computer Science |
| Dina | `dina@demo.edu` | `Demo1234!` | Medicine |

The demo command is optional and can be run again without duplicating demo requests. Other students can register normally. A new student can choose from five specializations and related courses/topics.

**Important:** The SQLite database `helpme.db` is created automatically. To reset the project, stop the server, delete `helpme.db`, then run `npm run demo` again. Do not delete a database containing real users.

## User flows

1. **Register** → choose one university major → **Login**. Everyone has both student and helper capabilities; there are no separate roles.
2. **Ask for help** → choose course/topic from your own major → set date/time → post publicly to the degree-specific **Help Requests** board.
3. **Offer help** → select matching courses/topics and available weekly time slots. Major is read-only and enforced by the server.
4. **Help Requests** → see all open requests from your major. **Accept** is enabled only when you offer the exact course/topic and have availability for that day/time. Accepting assigns you to the request. Only one student can accept an open request.
5. **Find helpers** → filter by course, topic, and optionally date/time → view a profile → send a personal invitation. Only the chosen helper can accept or decline the invitation.
6. **My Activity** → outgoing requests and incoming sessions. Requester can cancel, confirm completion, and leave a **1–5 star rating** after completion. Helper can withdraw from an accepted session; it returns to the public request board.
7. **My Profile** → edit name/university/study year; see offers, availability, and reviews. Specialization is fixed.

**Open requests** can be hidden from an individual helper's board without cancelling them for others. **Personal invitations** can be declined, changing their status to `rejected`.

## Server architecture

- **Frontend:** Responsive HTML/CSS/vanilla JavaScript (no bundler or client framework needed).
- **Backend:** Node.js + Express JSON REST API.
- **Persistence:** SQLite via `better-sqlite3` (data survives restart).
- **Authentication:** `bcryptjs` password hashes + signed JWT sessions (7 days).
- **Security:** Backend specialization checks, topic/course validation, weekday/time overlap, authorization for state transitions, HTML output escaping, and atomic first-come acceptance.

The core matching rule is `same specialization AND same course AND same topic AND preferred time is within helper's weekly availability`. The requester cannot accept their own request. Matching logic is in `lib/matching.js` and the API validates it server-side.

### API endpoints

| Purpose | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Catalog | `GET /api/specializations`, `GET /api/catalog` |
| Profile | `GET /api/profile`, `PUT /api/profile` |
| Offer | `GET /api/offers/mine`, `POST /api/offers` |
| Helpers | `GET /api/helpers`, `GET /api/helpers/:id` |
| Requests | `POST /api/requests`, `GET /api/requests/feed`, `GET /api/requests/mine`, `GET /api/requests/incoming` |
| Lifecycle | `POST /api/requests/:id/{accept,reject,dismiss,cancel,withdraw,complete,rate}` |

Set a secure `JWT_SECRET` and `NODE_ENV=production` if deploying outside the classroom. For production, use HTTPS, rate limiting, secure session storage, monitoring, backups, verified university emails, and privacy policies. **This project is a full classroom demo, not a hosted production service.**

## Testing

```bash
npm test
```

Includes server API tests using Node's built-in test runner and a temporary database. See `DEFENSE_GUIDE.md` for the presentation walkthrough and `TESTING.md` for manual test cases.

## Note about the original project

All original key features and the Node/Express/SQLite approach were retained and expanded. The Week-2 features in the PDF (matching, availability, helper listing, acceptance, session completion, feedback and UI polishing) are implemented. The application name is now **HelpMe** throughout the interface and documentation. Notifications, live chat, external calendar sync and public cloud deployment were future/optional items in the PDF, not prerequisites for the core system.

## Preview images

`docs/preview/` contains screenshots of the HelpMe interface using sample data. They illustrate the visual design, and do not represent a deployed backend.
