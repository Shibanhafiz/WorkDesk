WorkDesk

A simple, organized workspace for managing tasks and projects.

WorkDesk is a task and project management application built with Next.js. It helps individuals organize their work, track deadlines, manage project progress, and understand their workload through a clean dashboard.

The goal is to make everyday work easier to organize without unnecessary complexity.

Features

Dashboard

- Overview of task and project activity
- Task statistics and priority summaries
- Recently updated tasks
- Upcoming deadlines

Task Management

- Create, edit, and delete tasks
- Set task priorities: Low, Medium, and High
- Track task status: To Do, In Progress, and Done
- Add descriptions and due dates
- Search and filter tasks
- Sort tasks and update their status quickly
- Assign tasks to projects or leave them unassigned

Project Management

- Create and edit projects
- View individual project details
- Track project task progress
- Search, filter, and sort projects
- Archive and restore projects
- View project schedules and associated tasks

Upcoming Tasks

- View overdue tasks
- Identify tasks due soon
- Separate later deadlines from undated tasks

Analytics

- View task status summaries
- Understand task priority distribution
- Generate insights from saved task data

Settings

- Light and dark appearance preferences
- Display density controls
- Default task priority
- Delete confirmation preference
- Custom display name

Settings are stored in browser local storage and do not currently sync between browsers or accounts.

Technology Stack

- Frontend: JavaScript, React, Next.js App Router
- Styling: Tailwind CSS
- Database: SQLite
- ORM: Prisma ORM 7
- Testing: Node.js test runner
- Code Quality: ESLint

Application Pages

Route| Purpose
"/"| Dashboard and workspace overview
"/projects"| Project management
"/projects/[id]"| Individual project details
"/tasks"| Task management
"/upcoming"| Upcoming and overdue tasks
"/analytics"| Task analytics
"/settings"| Application preferences

Project Structure

WorkDesk/
├── app/
│   ├── api/
│   │   ├── projects/
│   │   └── tasks/
│   ├── components/
│   ├── lib/
│   ├── analytics/
│   ├── projects/
│   ├── settings/
│   ├── tasks/
│   ├── upcoming/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── tests/
├── package.json
└── README.md

Getting Started

Prerequisites

- Node.js 24 LTS or a newer supported release
- npm
- Git

1. Clone the repository

git clone https://github.com/Shibanhafiz/WorkDesk.git
cd WorkDesk

2. Install dependencies

npm install

3. Initialize the database

npm run db:deploy

This applies the committed Prisma migrations to the local SQLite database.

4. Start the development server

npm run dev

Open:

http://localhost:3000

Available Commands

Command| Description
"npm run dev"| Start development server
"npm run build"| Create production build
"npm start"| Start production server
"npm test"| Run automated tests
"npm run lint"| Run ESLint
"npm run db:generate"| Generate Prisma Client
"npm run db:migrate"| Create and apply a development migration
"npm run db:deploy"| Apply committed migrations
"npm run db:studio"| Open Prisma Studio

How It Works

WorkDesk uses a simple application architecture:

1. The user interacts with the Next.js interface.
2. React components manage user interactions and application state.
3. The frontend sends requests to Next.js API routes.
4. API routes validate incoming data.
5. Prisma Client communicates with the SQLite database.
6. Saved data is returned to the interface and displayed.

The browser communicates with the API rather than accessing the database directly.

Database Design

WorkDesk currently uses two main database models:

- Task: Stores task information, priority, status, due date, and timestamps.
- Project: Stores project information, status, descriptions, and scheduling details.

A project can contain multiple tasks. A task can belong to one project or remain unassigned.

Project archiving preserves its associated tasks.

Testing

Run the following commands before submitting changes:

npm test
npm run lint
npm run build

The project includes tests for task validation, task insights, project validation, and project insights.

Current Limitations

WorkDesk is currently a local development project.

- No user registration or authentication.
- No multi-user collaboration or shared workspaces.
- Preferences are stored locally in the browser.
- SQLite is configured for local development.
- Production deployment requires persistent database storage and appropriate migration setup.

These capabilities are not currently advertised as implemented features.

Future Improvements

Potential future development includes:

- User authentication and individual workspaces
- Shared projects and team collaboration
- Cloud database support
- Notifications and reminders
- File attachments
- Calendar integration
- Production deployment

Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the tests and lint checks.
5. Submit a pull request.

Author

Shiban Hafiz

- GitHub: https://github.com/Shibanhafiz

License

No license has been specified yet. All rights are reserved unless a license is added to this repository.
