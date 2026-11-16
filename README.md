<H1>WorkDesk</H1>

<p align="center">
  <strong>A Simple, Structured Workspace for Projects and Tasks</strong>
</p><p align="center">
  A lightweight project and task management application built to help individuals organize projects, manage daily tasks, track progress, and understand their workload from one place.
</p><p align="center">
  <img src="https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite" alt="SQLite" />
</p><p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a>
</p>---

Overview

WorkDesk is a project and task management application designed for individuals and small teams who need a straightforward way to organize their work.

It brings project organization, task tracking, deadlines, priorities, and progress insights into a single interface.

The application uses Next.js and React for the user interface, API route handlers for backend operations, Prisma ORM for database access, and SQLite for local data persistence.

Why WorkDesk?

Managing projects and tasks across multiple places can make it difficult to understand priorities and track progress.

WorkDesk provides a centralized workspace where users can:

- Organize work into projects.
- Create and manage individual tasks.
- Assign priorities and track task status.
- Monitor upcoming deadlines.
- Review project progress.
- Understand task distribution through analytics.

Features

Dashboard

- Overview of saved task statistics.
- Recent task activity.
- Priority distribution summary.
- Database-backed task insights.

Project Management

- Create and edit projects.
- Search projects by name.
- Filter projects by status.
- Sort project listings.
- Archive and restore projects.
- View individual project details.
- Monitor project schedules and task progress.

Task Management

- Create, edit, and delete tasks.
- Search by task title and description.
- Filter by status, priority, and project.
- Sort task listings.
- Update task status quickly.
- Assign tasks to projects or leave them unassigned.
- View individual task details.
- Set optional due dates.

Upcoming Tasks

Tasks are organized into four categories:

- Overdue: Tasks with past due dates that remain incomplete.
- Due Soon: Tasks due today or within the next seven days.
- Later: Tasks scheduled beyond the upcoming seven-day period.
- No Due Date: Tasks without a specified deadline.

Analytics

- Task status distribution.
- Priority distribution.
- Insights calculated from saved database records.

Settings and Preferences

- Appearance preferences.
- Display density controls.
- Default task priority.
- Delete confirmation preference.
- Display name customization.

Preferences are stored in browser "localStorage" and are not synchronized between browsers or accounts.

Application Pages

Page| Route| Purpose
Dashboard| "/"| Overview of tasks and project activity
Projects| "/projects"| Create, organize, search, and archive projects
Project Details| "/projects/[id]"| View project schedule and task progress
All Tasks| "/tasks"| Manage and filter tasks
Upcoming| "/upcoming"| Review tasks by due date
Analytics| "/analytics"| View task status and priority summaries
Settings| "/settings"| Customize application preferences

Technology Stack

Technology| Purpose
JavaScript| Application programming language
Next.js App Router| Application framework and routing
React| Component-based user interface
Tailwind CSS| Styling and responsive layouts
Prisma ORM 7| Database access and data management
SQLite| Local relational database
Node.js| JavaScript runtime
npm| Package management

Architecture

WorkDesk follows a straightforward application architecture. The frontend communicates with backend API routes, which validate requests and use Prisma to interact with the SQLite database.

flowchart TD
    A["User"] --> B["Next.js Application"]
    B --> C["React Components"]
    C --> D["API Route Handlers"]
    D --> E["Server-side Validation"]
    E --> F["Prisma ORM"]
    F --> G[("SQLite Database")]
    G --> F
    F --> D
    D --> C
    C --> H["Updated User Interface"]

Task Creation Workflow

The following diagram illustrates how a task is created and saved.

sequenceDiagram
    actor User
    participant Form as Task Form
    participant UI as React Component
    participant API as Next.js API
    participant Prisma
    participant DB as SQLite

    User->>Form: Enter task details
    Form->>UI: Submit task
    UI->>API: POST /api/tasks
    API->>API: Validate request
    API->>Prisma: Create task
    Prisma->>DB: Save task
    DB-->>Prisma: Saved record
    Prisma-->>API: Return task
    API-->>UI: JSON response
    UI-->>User: Update task list

Database Design

WorkDesk uses two primary database models: "Project" and "Task".

erDiagram
    PROJECT ||--o{ TASK : contains

    PROJECT {
        string id PK
        string name
        string description
        string status
        datetime startDate
        datetime dueDate
        datetime createdAt
        datetime updatedAt
    }

    TASK {
        string id PK
        string title
        string description
        string status
        string priority
        datetime dueDate
        string projectId FK
        datetime createdAt
        datetime updatedAt
    }

Relationship details:

- One project can contain multiple tasks.
- A task can belong to zero or one project.
- "Task.projectId" is a nullable foreign key.
- Tasks can remain unassigned.
- Archiving a project does not delete its tasks.
- The application does not currently provide permanent project deletion.

Project Structure

WorkDesk/
│
├── app/
│   ├── api/
│   │   ├── projects/
│   │   │   ├── [id]/
│   │   │   └── route.js
│   │   └── tasks/
│   │       ├── [id]/
│   │       └── route.js
│   │
│   ├── components/
│   │   ├── TaskForm.js
│   │   ├── TaskManagement.js
│   │   ├── Sidebar.js
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── prisma.js
│   │   └── useTasks.js
│   │
│   ├── projects/
│   ├── tasks/
│   ├── upcoming/
│   ├── analytics/
│   ├── settings/
│   └── page.js
│
├── generated/
│   └── prisma/
│
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── workdesk.db
│
├── public/
├── tests/
├── prisma.config.mjs
├── package.json
└── README.md

Generated Prisma Client code and the local database file are not committed to the repository.

Database and Data Management

Prisma ORM

Prisma handles communication between the backend and SQLite.

Important files:

- "prisma/schema.prisma" — Defines database models and relationships.
- "prisma.config.mjs" — Configures Prisma CLI and database location.
- "prisma/migrations/" — Contains database migration history.
- "app/lib/prisma.js" — Reuses a Prisma Client instance during development.
- "generated/prisma/" — Contains generated Prisma Client code.

The browser does not connect directly to SQLite. All database operations go through backend API routes.

Task Fields

Field| Description
"title"| Required task title
"description"| Optional task description
"status"| TODO, IN_PROGRESS, or DONE
"priority"| LOW, MEDIUM, or HIGH
"dueDate"| Optional due date
"projectId"| Optional project relationship
"createdAt"| Record creation timestamp
"updatedAt"| Last update timestamp

Default values:

- Priority: "MEDIUM"
- Status: "TODO"

Server-side validation checks incoming task and project data before database operations.

API Reference

Task APIs

Method| Endpoint| Description
GET| "/api/tasks"| Retrieve tasks
POST| "/api/tasks"| Create a task
PATCH| "/api/tasks/[id]"| Update a task
DELETE| "/api/tasks/[id]"| Delete a task

Project APIs

Method| Endpoint| Description
GET| "/api/projects"| Retrieve projects
POST| "/api/projects"| Create a project
GET| "/api/projects/[id]"| Retrieve project details
PATCH| "/api/projects/[id]"| Update a project

All API routes validate incoming data on the server before saving changes.

Getting Started

Follow these steps to run WorkDesk locally.

Prerequisites

Make sure you have installed:

- Node.js 24 LTS or a newer supported release.
- npm.
- Git.

1. Clone the Repository

git clone https://github.com/Shibanhafiz/WorkDesk.git

2. Open the Project

cd WorkDesk

3. Install Dependencies

npm install

4. Initialize the Database

npm run db:deploy

This applies the committed Prisma migrations to the local SQLite database.

5. Start the Development Server

npm run dev

6. Open WorkDesk

Visit:

http://localhost:3000

The development command generates Prisma Client before starting Next.js.

Database Migrations

When modifying "prisma/schema.prisma", create and apply a development migration:

npm run db:migrate -- --name describe_your_change

To apply existing committed migrations:

npm run db:deploy

To open Prisma Studio:

npm run db:studio

The local database is stored at:

prisma/workdesk.db

The database file is ignored by Git and remains on disk when the development server restarts.

Testing and Code Quality

Run the following commands to check the project.

Run Tests

npm test

Run ESLint

npm run lint

Create a Production Build

npm run build

These checks help verify application behavior, code quality, and production build compatibility.

Deployment Considerations

WorkDesk currently uses a local SQLite database.

For production deployment:

- The hosting environment must provide durable, writable storage.
- The SQLite database URL must point to the correct persistent database file.
- Both Prisma configuration and the application must use the same database location.
- Apply committed migrations before starting the production server.

Ephemeral or serverless filesystems may lose database data when instances restart. A persistent volume or a database service supported by the hosting provider is needed.

Current deployment limitations:

- No user accounts or authentication.
- No remote database configuration.
- No cloud synchronization.
- No built-in multi-user collaboration.
- Browser preferences are stored locally.

Current Limitations

WorkDesk is a learning project focused on project organization, task management, and full-stack application fundamentals.

The current version does not include:

- Authentication and user-specific workspaces.
- Real-time collaboration.
- Team invitations and role-based permissions.
- Cloud-based data synchronization.
- Permanent project deletion through the application.

Future Roadmap

Potential improvements for future versions:

- User authentication and account management.
- Cloud database integration.
- Team workspaces and collaboration.
- Task comments and activity history.
- Notifications and reminders.
- File attachments.
- Improved analytics and reporting.
- Deployment-ready production configuration.

These are planned improvements, not features currently implemented.

Learning Outcomes

This project provides practical experience with:

- Building interfaces using React components.
- Working with the Next.js App Router.
- Managing frontend state.
- Connecting frontend components to backend API routes.
- Implementing CRUD operations.
- Validating API requests.
- Designing relational database models.
- Using Prisma ORM with SQLite.
- Managing database migrations.
- Writing tests and checking code quality.

Author

Shiban Hafiz

B.E. Artificial Intelligence and Machine Learning Student

- GitHub: "@Shibanhafiz" (https://github.com/Shibanhafiz)
- Project Repository: "WorkDesk" (https://github.com/Shibanhafiz/WorkDesk)
- Portfolio: "shibanhafiz-portfolio.vercel.app" (https://shibanhafiz-portfolio.vercel.app/)

---

<p align="center">
  <strong>WorkDesk</strong>
  <br />
  Organize projects. Manage tasks. Track progress.
  <br /><br />
  Built as a full-stack learning project.
</p>
