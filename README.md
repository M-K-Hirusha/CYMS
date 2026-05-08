# CYMS – Construction Yard Management System

Final Year Project
NSBM Green University

---

# 📌 Project Overview

CYMS (Construction Yard Management System) is a full-stack MERN web application developed to manage construction yard operations across multiple locations with secure inventory control, material tracking, and role-based operational workflows.

The system is designed to improve inventory visibility, reduce manual stock handling errors, and provide centralized control over material movement between MAIN yards and SITE yards.

The application supports:

* Multi-yard inventory management
* Material and equipment tracking
* Material Request (MR) workflows
* Stock Receive / Issue / Transfer operations
* Yard and location management
* Role-based access control (RBAC)
* Secure JWT authentication
* Transaction-safe stock updates
* Audit trail logging
* Responsive admin dashboard interface
* Real-time operational summaries and reporting

---

# 🏗 System Architecture

The project follows a clean backend-first architecture using modular service-based development principles.

## Architecture Highlights

* RESTful API design
* Modular Express backend
* React frontend with reusable UI components
* Middleware-based authentication and authorization
* MongoDB transactional operations using Mongoose sessions
* Service-layer business logic separation
* Reusable frontend API services
* Environment-based configuration validation
* Responsive dashboard-driven UI

---

# ⚙️ Tech Stack

## Frontend

* React.js (Vite)
* React Router DOM
* Axios
* Recharts
* Lucide React Icons
* Context API
* Custom responsive admin UI system

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt password hashing
* Mongoose Transactions

---

# 🔐 Role-Based Access Control (RBAC)

The system currently supports four user roles:

| Role              | Access Scope                     |
| ----------------- | -------------------------------- |
| SYSTEM_ADMIN      | Full system access               |
| HEAD_OFFICE_ADMIN | MAIN yard operational management |
| SITE_ADMIN        | SITE yard management             |
| SITE_STAFF        | Limited operational access       |

RBAC is implemented using:

* JWT authentication middleware
* Protected frontend routes
* Backend authorization middleware
* Yard-scoped access filtering
* Role-based UI rendering

---

# 🏢 Yard Management Structure

The system supports two yard types:

## MAIN Yard

Central warehouse or headquarters inventory location.

Default Location:

* MAIN_STORE

## SITE Yard

Project-specific operational yard.

Default Location:

* SITE_STORE

Each yard supports:

* Multiple internal storage locations
* Active/inactive status management
* Project-based identification
* Location-level stock control

---

# 📦 Inventory Architecture

The inventory system is built using two core models:

## Stock

Maintains current material balance per yard and location.

Tracks:

* Material quantity
* Yard ownership
* Location assignment

## StockMovement

Maintains audit history of all inventory operations.

Tracks:

* Receive operations
* Issue operations
* Transfer operations
* MR dispatch movements
* User activity history

---

# 🔄 Supported Inventory Operations

The system currently supports:

## Receive Stock

Add material quantities into a yard location.

## Issue Stock

Remove material quantities from a yard location.

## Transfer Stock

Transfer inventory between yards and locations.

## Material Request Dispatch

Dispatch materials from MAIN yards to SITE yards through MR approval workflow.

---

# 🛡 Inventory Protection Features

All stock operations are:

* Transaction-safe
* Negative-stock protected
* Location-validated
* Role-restricted
* Audit logged
* Atomic-operation protected

Mongoose session transactions are used to ensure inventory consistency.

---

# 📋 Material Request (MR) Workflow

The Material Request system supports operational communication between SITE yards and MAIN yards.

## Workflow

1. SITE_ADMIN creates MR
2. HEAD_OFFICE_ADMIN or SYSTEM_ADMIN reviews request
3. MR can be:

   * Approved
   * Rejected
4. Approved materials automatically update inventory
5. Stock movement audit logs are created

Features include:

* Multi-item MR creation
* Approval quantity editing
* Dispatch MAIN yard selection
* Rejection reasons
* Approval history tracking
* PDF report generation

---

# 📊 Reporting System

The reporting module provides operational analytics and downloadable reports.

## Available Reports

* Tool reports
* Material Request reports
* Stock reports
* Stock movement reports

## Export Formats

* PDF
* Excel (.xlsx)

## Dashboard Analytics

* Tool status summaries
* MR approval summaries
* Stock quantity summaries
* Inventory activity tracking

---

# 🧰 Tool Management Module

The tool management system supports equipment lifecycle tracking.

## Tool Statuses

* AVAILABLE
* ISSUED
* MAINTENANCE
* RETIRED

## Features

* Tool issuance
* Tool return
* Tool transfer
* Maintenance tracking
* Tool movement history
* Yard assignment tracking

---

# 🎨 Frontend UI System

The frontend uses a fully custom responsive admin interface.

## UI Features

* Responsive layouts
* Mobile-friendly dashboards
* Reusable card system
* Consistent dark/light theme styling
* Toast notification system
* Modal-based workflows
* KPI summary cards
* Dynamic filtering and pagination
* Reusable action dropdown system

---

# 📁 Project Structure

## Frontend

```bash
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   ├── services/
│   ├── styles/
│   └── utils/
```

## Backend

```bash
backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── config/
```

---

# 🚀 Implemented Modules

## Authentication System

* JWT login
* Password hashing
* Protected routes
* Session persistence

## User Management

* Role assignment
* Yard assignment
* RBAC enforcement

## Yard Management

* MAIN/SITE yard structure
* Internal locations
* Yard activation system

## Material Management

* Material CRUD operations
* Dynamic unit support

## Inventory Management

* Receive/Issue/Transfer
* Transaction-safe stock operations

## Tool Management

* Tool lifecycle tracking
* Equipment movement history

## Material Request System

* Approval/rejection workflow
* Dispatch management

## Reporting Dashboard

* KPI analytics
* Exportable reports

---

# 📱 Responsive Design Support

The system is optimized for:

* Desktop devices
* Tablets
* Mobile devices

Responsive layouts include:

* Adaptive dashboard grids
* Mobile action cards
* Responsive modal layouts
* Flexible table rendering
* Mobile-friendly navigation

---

# 🔒 Security Features

The system includes:

* JWT authentication
* Password hashing with bcrypt
* Protected API routes
* Role-based authorization
* Transaction-safe inventory updates
* Unauthorized route protection
* Input validation
* Location validation
* Negative stock prevention

---

# 🧪 Testing Status

The following modules have been tested successfully:

* Authentication APIs
* RBAC middleware
* Yard operations
* Inventory transactions
* Material Request workflows
* Tool operations
* Reporting APIs
* Frontend route protection

Testing tools used:

* Postman
* Browser integration testing
* Transaction validation testing

---

# 🎯 Current Development Status

The system currently includes:

✅ Authentication System
✅ RBAC System
✅ Yard Management
✅ Material Management
✅ Inventory Management
✅ Tool Management
✅ Material Request Workflow
✅ Reporting Dashboard
✅ Responsive Frontend UI
✅ Transaction-safe Stock Operations

---

# 🚀 Future Improvements

Planned future enhancements include:

* Email notifications
* Barcode/QR code support
* Real-time WebSocket updates
* Advanced analytics dashboard
* Cloud deployment
* Mobile application
* File attachment support
* Purchase order integration
* Supplier management

---

# ⚡ Installation Guide

## Clone Repository

```bash
git clone https://github.com/M-K-Hirusha/CYMS.git
```

## Install Backend Dependencies

```bash
cd backend
npm install
```

## Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Run Backend

```bash
npm run dev
```

## Run Frontend

```bash
npm run dev
```

---

# 🔧 Environment Variables

## Backend `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
```

## Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

# 👨‍💻 Developer

## Hirusha Nilupul

Final Year Undergraduate
NSBM Green University

---

# 📄 License

This project was developed for academic and educational purposes as part of a Final Year Software Engineering project.
