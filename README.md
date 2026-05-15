# CYMS

**Construction Yard Management System**

A full-stack web-based system for managing construction yard materials, tools, inventory, material requests, users, roles, reports, and multi-yard operations.

<p align="center">
  <img src="frontend/src/assets/cyms-logo.png" alt="CYMS Logo" width="300"/>
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,mongodb,js,git,github,vscode" alt="Technology Icons"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
  <img src="https://img.shields.io/badge/Recharts-Analytics-2563EB?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Recharts"/>
  <img src="https://img.shields.io/badge/jsPDF-PDF_Reports-EF4444?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="jsPDF"/>
  <img src="https://img.shields.io/badge/XLSX-Excel_Export-16A34A?style=for-the-badge&logo=microsoftexcel&logoColor=white" alt="XLSX"/>
  <img src="https://img.shields.io/badge/Jest-Backend_Testing-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest"/>
  <img src="https://img.shields.io/badge/Vitest-Frontend_Testing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest"/>
</p>

---

## Project Overview

CYMS is a Construction Yard Management System developed as a final-year computing project. The system is designed to support construction companies that manage materials, tools, stock movements, material requests, users, and site yard operations across multiple locations.

The project was developed with reference to the practical construction yard management needs of **DKS Builders**. The system focuses on improving stock visibility, reducing manual record errors, speeding up material request approvals, improving accountability, and supporting better operational decision-making through dashboards and reports.

CYMS provides a centralized digital platform for:

- Multi-yard inventory management
- Material and tool tracking
- Stock receiving, issuing, and transferring
- Material request creation and approval
- Yard and location management
- User and role management
- Dashboard summaries and analytics
- PDF and Excel report exports
- Role-based access control
- Responsive admin panel interface

This repository contains the frontend, backend, testing files, and realistic demonstration seed data used for academic project demonstration.

---

## Problem Statement

Construction companies often manage yard materials, tools, and stock records using manual files, spreadsheets, phone calls, or informal communication. This creates several practical problems:

- Stock records can become inaccurate or outdated.
- Head office users may not have clear visibility of materials available at each yard.
- Site teams may face delays when requesting materials.
- Tool issuing, returning, and maintenance records can be difficult to track.
- Manual reporting takes time and can lead to mistakes.
- Different users need different access permissions, but manual systems do not control this properly.

CYMS addresses these problems by providing one centralized platform for construction yard operations.

---

## Proposed Solution

CYMS solves the above problems through a full-stack digital workflow. System users can manage yards, materials, tools, inventory records, material requests, users, and reports from one platform.

The system supports different user roles, so each user only accesses the functions they are allowed to use. It also records stock movements and tool movements, which improves accountability and traceability.

The result is a practical construction yard management platform that supports:

- Better stock accuracy
- Faster request handling
- Clearer operational visibility
- Improved user accountability
- Stronger reporting and decision-making
- More organized construction yard workflows

---

## Key Features

### User and Role Management

- Create and manage system users
- Activate and deactivate user accounts
- Assign users to correct roles
- Assign site users to specific site yards
- Assign head office users to main yards
- Enforce role-based access control

### Yard Management

- Create and manage main yards and site yards
- Support yard-specific storage locations
- Activate and deactivate yards
- Maintain separate yard types for main warehouse and construction sites

### Material Management

- Create, update, and manage construction materials
- Store material name, code, unit, and category
- Prevent duplicate material codes
- Support material activation status

### Material Creation Requests

- Allow site users to request new material creation
- Support pending, approved, and rejected statuses
- Maintain request history and decision notes
- Help control material records before adding them to the system

### Inventory Management

- Track stock by material, yard, and location
- Receive stock into yards
- Issue stock from yards
- Transfer stock between yards
- Prevent negative stock quantity
- Record stock movement history

### Material Request Management

- Site users can create material requests
- Head office users can approve or reject requests
- Approved quantities can be entered during approval
- Rejection reason is required for rejected requests
- Material request history is maintained

### Tool Management

- Create and manage construction tools
- Track tool status:
  - Available
  - Issued
  - Maintenance
  - Retired
- Issue tools to holders
- Return tools to yard locations
- Transfer tools between yards
- Maintain tool movement history

### Dashboard

- View system overview cards
- Display total tools
- Display total material requests
- Display total stock quantity
- Display pending material requests
- Show material request summary
- Show tools summary
- Show stock summary
- Show action checklist

### Reports and Analytics

- View report summary cards
- Display charts for tool status and material request status
- Download PDF reports
- Export stock data to Excel
- Filter reports using date range and yard filters
- Support operational decision-making

### Responsive User Interface

- Desktop admin panel layout
- Mobile-friendly sidebar drawer
- Responsive dashboard cards
- Responsive report layout
- Mobile-friendly forms, tables, and action sections

---

## User Roles

| Role | Main Responsibility |
|---|---|
| `SYSTEM_ADMIN` | Full system access, user management, yard management, materials, inventory, tools, requests, and reports |
| `HEAD_OFFICE_ADMIN` | Main yard operations, material request approvals, stock control, reporting, and tool management |
| `SITE_ADMIN` | Assigned site yard operations, material requests, stock issuing, and site-level tool/material visibility |
| `SITE_STAFF` | Limited access for assigned site yard operations and material request-related tasks |

---

## System Workflow

```text
System Admin
  |
  |-- Creates users, roles, yards, and base records
  |
Head Office Admin
  |
  |-- Manages materials, tools, stock, reports, and approvals
  |
Site Admin / Site Staff
  |
  |-- Creates material requests for assigned site yard
  |
  |-- Views assigned yard information
  |
Head Office Admin
  |
  |-- Reviews and approves or rejects material requests
  |
  |-- Stock movement is recorded
  |
Dashboard and Reports
  |
  |-- Shows summaries, charts, PDF exports, and Excel exports
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router DOM, Context API |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT Authentication |
| Access Control | Role-Based Access Control |
| Charts | Recharts |
| PDF Export | jsPDF, jspdf-autotable |
| Excel Export | XLSX |
| Icons | Lucide React |
| Testing | Jest, Supertest, Vitest, React Testing Library |
| Development Tools | VS Code, Git, GitHub, MongoDB Atlas |

---

## Architecture Overview

```text
React + Vite Frontend
  |
  |-- Login and protected routes
  |-- Role-based navigation
  |-- Dashboard, reports, forms, tables, and modals
  |
Express.js / Node.js Backend
  |
  |-- Authentication APIs
  |-- User APIs
  |-- Yard APIs
  |-- Material APIs
  |-- Inventory APIs
  |-- Material Request APIs
  |-- Material Creation Request APIs
  |-- Tool APIs
  |-- Report APIs
  |
MongoDB + Mongoose
  |
  |-- Users
  |-- Yards
  |-- Materials
  |-- Stocks
  |-- Stock Movements
  |-- Material Requests
  |-- Material Creation Requests
  |-- Tools
  |-- Tool Movements
  |-- Counters
```

---

## Main Folder Structure

```text
CYMS/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   ├── server.js
│   │   └── seedRealisticDemoData.js
│   ├── health.test.js
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── frontend.test.jsx
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```

---

## Database Models

| Model | Purpose |
|---|---|
| User | Stores user accounts, roles, assigned yards, managed yards, and account status |
| Yard | Stores main yards, site yards, project codes, locations, and status |
| Material | Stores material name, code, unit, category, and status |
| Stock | Stores stock quantity by yard, location, and material |
| StockMovement | Stores receive, issue, transfer, adjustment, and material dispatch history |
| MR | Stores material requests, requested items, approval status, and request history |
| MaterialCreationRequest | Stores requests for creating new materials |
| Tool | Stores tool details, status, current yard, location, and holder |
| ToolMovement | Stores tool issue, return, transfer, and status-change history |
| Counter | Stores automatic sequence numbers for system documents |

---

## Testing Summary

CYMS includes automated and manual testing evidence.

### Backend Testing

Backend API tests were created using Jest and Supertest.

Test coverage includes:

- Health API
- Protected routes
- Authentication validation
- Unauthorized access blocking
- Invalid route handling
- Invalid request body validation
- HTTP method validation
- API security and error handling

Backend automated test result:

```text
Test Suites: 1 passed
Tests: 50 passed
```

### Frontend Testing

Frontend component tests were created using Vitest and React Testing Library.

Test coverage includes:

- Login page rendering
- Email and password input fields
- Login button
- Dashboard title
- Dashboard summary cards
- Main navigation links
- Inventory form fields
- Reports page title
- Report download buttons
- Tools page title
- Tool action buttons

Frontend automated test result:

```text
Test Files: 1 passed
Tests: 20 passed
```

### Build Validation

The frontend production build was tested successfully using:

```bash
npm run build
```

---

## Demo Data

The repository includes a realistic demonstration seed script:

```text
backend/src/seedRealisticDemoData.js
```

This script creates sample academic demonstration data only. It does not contain real company confidential data.

The seed data includes:

- System administrator account
- Head office administrator accounts
- Site administrator accounts
- Site staff accounts
- Main yards
- Site yards
- Construction materials
- Stock records
- Material requests
- Material creation requests
- Tools
- Stock movement history
- Tool movement history

To run the seed script:

```bash
cd backend
node src/seedRealisticDemoData.js
```

---

## How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/M-K-Hirusha/CYMS.git
cd CYMS
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
BODY_LIMIT=100kb
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX=300
```

Start the backend:

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## Common Commands

### Backend

```bash
cd backend
npm install
npm run dev
npm test
node src/seedRealisticDemoData.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm test
```

---

## Security Notes

- `.env` files are ignored and must not be pushed to GitHub.
- MongoDB connection strings must be kept private.
- JWT secrets must be kept private.
- Demo login credentials are for academic demonstration only.
- Passwords are stored as hashed values in the database.
- Role-based access control is used to restrict user actions.
- Protected API routes require valid JWT authentication.

---

## Academic and Project Notes

CYMS was developed as an academic final-year project for the PUSL3190 Computing Project module. The system demonstrates:

- Full-stack MERN application development
- Secure authentication and role-based access control
- Practical construction yard workflow digitization
- Multi-yard stock and tool management
- Material request approval workflows
- Dashboard and reporting implementation
- Automated backend and frontend testing
- Responsive web interface development
- Git and GitHub-based version control

The project should be evaluated as a completed academic prototype and practical web-based solution for construction yard management.

---

## Limitations

Although CYMS provides the main features required for a construction yard management system, some limitations remain:

- The system is currently tested mainly in a local development environment.
- It has not yet been deployed as a production cloud application.
- Long-term real company usage testing has not yet been completed.
- Advanced notification features are not fully implemented.
- Future versions can include barcode/QR scanning, mobile app support, advanced audit dashboards, and automated alerts.

---

## Future Improvements

Future development can improve CYMS by adding:

- Cloud deployment with production configuration
- Email or SMS notifications
- QR code or barcode scanning for tools and materials
- Advanced audit log dashboard
- Supplier and purchase order management
- More detailed analytics and forecasting
- Mobile-first site staff interface
- Backup and restore tools
- CI/CD pipeline for automated testing and deployment

---

## Author and Project Information

| Item | Details |
|---|---|
| Project Name | CYMS |
| Full Name | Construction Yard Management System |
| Project Type | Final-Year Academic Computing Project |
| Institution | NSBM Green University |
| Module | PUSL3190 Computing Project |
| Repository | https://github.com/M-K-Hirusha/CYMS |
| Primary Users | Construction company administrators, head office users, site admins, and site staff |
| Main Objective | To improve construction yard stock visibility, material request handling, tool tracking, reporting, and role-based operational control |

---

## Repository

```text
https://github.com/M-K-Hirusha/CYMS
```

Clone command:

```bash
git clone https://github.com/M-K-Hirusha/CYMS.git
```

---

## License

This project was developed as part of a Final Year Software Engineering project in collaboration with a real-world construction company.

CYMS (Construction Yard Management System) was designed and implemented to support practical construction yard operations, including inventory management, material requests, tool tracking, and reporting workflows.

This repository is intended for portfolio, academic, and demonstration purposes unless otherwise authorized by the project owner.