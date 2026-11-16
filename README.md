WorkDesk

A simple workspace to organize projects, manage tasks, and track progress.

WorkDesk is a lightweight project and task management application built with Next.js. It helps individuals organize their work, manage deadlines, prioritize tasks, and monitor project progress through a clean dashboard.

Overview

WorkDesk brings project organization and task management together in one place. Projects can contain multiple tasks, while tasks can also remain unassigned when needed.

The application uses a local SQLite database to persist tasks and projects.

Features

Dashboard

- View task statistics and recent tasks.
- Monitor task status and priority.
- See an overview of project and task activity.

Task Management

- Create, edit, and delete tasks.
- Set task priorities: Low, Medium, and High.
- Track task status: To Do, In Progress, and Done.
- Add descriptions and due dates.
- Search and filter tasks.
- Sort tasks and update their status quickly.
- Assign tasks to projects or leave them unassigned.

Project Management

- Create and edit projects.
- View individual project details.
- Track project schedules and task progress.
- Search, filter, and sort projects.
- Archive and restore projects.

Upcoming Tasks

- View overdue tasks.
- Identify tasks due today or within the next seven days.
- Separate later deadlines from undated tasks.

Analytics

- View task status and priority summaries.
- Review insights calculated from saved tasks.

Settings

- Change appearance and display density.
- Set a default task priority.
- Configure delete confirmation.
- Set a display name.

Preferences are stored in the browser's local storage and do not sync across browsers or devices.

Technology Stack

Technology| Purpose
JavaScript| Application logic
Next.js| App framework and routing
React| User interface
Tailwind CSS| Styling
Prisma ORM 7| Database access
SQLite| Local database
Node.js| Runtime

Application Pages

Route| Description
"/"| Dashboard and task overview
"/tasks"| Create and manage tasks
"/projects"| Manage projects
"/projects/[id]"| Individual project details
"/upcoming"| Upcoming and overdue tasks
"/analytics"| Task analytics
"/settings"| Application preferences

Getting Started

Prerequisites

- Node.js 24 LTS or a newer supported release
- npm

1. Clone the repository

git clone https://github.com/Shibanhafiz/WorkDesk.git
cd WorkDesk

2. Install dependencies

npm install

3. Set up the database

npm run db:deploy

This applies the committed Prisma migrations and prepares the local SQLite database.

4. Start the development server

npm run dev

Open your browser and visit:

http://localhost:3000

The development command generates Prisma Client before starting Next.js.

Database & Architecture

WorkDesk uses SQLite for local data storage and Prisma ORM for database operations.

The application follows this flow:

User Interface (Next.js / React)
              |
              v
       API Route Handlers
              |
              v
         Prisma ORM
              |
              v
          SQLite

Data Model

- Project: Stores project information, status, and schedule.
- Task: Stores task details, priority, status, and due date.
- Relationship: A project can contain multiple tasks. A task can belong to one project or remain unassigned.

Project archiving changes its status without deleting its tasks. The application does not currently provide permanent project deletion.

Database Location

The local database is stored at:

prisma/workdesk.db

The database file is excluded from Git.

When modifying "prisma/schema.prisma", create a development migration:

npm run db:migrate -- --name describe_your_change

For an existing deployment, apply committed migrations with:

npm run db:deploy

API Overview

Method| Endpoint| Purpose
GET| "/api/tasks"| Retrieve tasks
POST| "/api/tasks"| Create a task
PATCH| "/api/tasks/[id]"| Update a task
DELETE| "/api/tasks/[id]"| Delete a task
GET| "/api/projects"| Retrieve projects
POST| "/api/projects"| Create a project
GET| "/api/projects/[id]"| Retrieve project details
PATCH| "/api/projects/[id]"| Update a project

Task and project request data are validated on the server before database operations.

Validation & Testing

WorkDesk includes validation for task and project data, along with focused tests for input validation and task insights.

Run the available checks:

npm test
npm run lint
npm run build

Project Structure

workdesk/
├── app/
│   ├── api/
│   ├── components/
│   ├── lib/
│   ├── projects/
│   ├── analytics/
│   ├── settings/
│   ├── upcoming/
│   ├── tasks/
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── tests/
├── package.json
├── prisma.config.mjs
└── README.md

Current Limitations

- No user accounts or authentication.
- No cloud database or cross-device synchronization.
- Application preferences are browser-local.
- SQLite requires durable, writable storage when deployed.
- Permanent project deletion is not available in the application.

About the Project

WorkDesk is a personal development project focused on building a practical full-stack application while learning modern JavaScript, React, Next.js, API development, and database integration.

Repository: "github.com/Shibanhafiz/WorkDesk" (https://github.com/Shibanhafiz/WorkDesk)

Developed by "Shiban Hafiz" (https://github.com/Shibanhafiz)
