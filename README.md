# CYMS - Construction Yard Management System

Final Year Project  
NSBM Green University  

---

## 📌 Project Overview

CYMS (Construction Yard Management System) is a full-stack web application designed to manage construction yard operations across multiple locations.

The system supports:

- Multi-yard inventory management
- Material and equipment tracking
- Stock movements (Receive / Issue / Transfer)
- Project-based material allocation
- Role-based access control (RBAC)
- Secure authentication and authorization
- Transaction-safe inventory updates
- Audit trail logging for stock movements

---

## 🏗 System Architecture

The project follows a clean backend-first architecture using:

- RESTful API design
- Middleware-based security layer
- Role-based access control (RBAC)
- Transaction-based stock operations (Mongoose sessions)
- Modular controller structure
- Environment-based configuration validation

---

## ⚙️ Tech Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Tailwind CSS (Planned)

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- bcrypt (Password hashing)
- Mongoose Transactions (Session-based)

---

## 🔐 Role Structure

The system currently supports:

- SYSTEM_ADMIN
- HEAD_OFFICE_ADMIN
- SITE_ADMIN
- SITE_STAFF

Each role has controlled access to specific API routes and dashboards using RBAC middleware.

---

## 📦 Inventory Architecture

The inventory system is built using two core models:

- **Stock** → Maintains current material balance per yard and location
- **StockMovement** → Maintains audit history of all stock operations

Supported operations:

- Receive stock
- Issue stock
- Transfer stock between yards
- Real-time stock querying with filtering

All stock operations are:

- Transaction-safe
- Negative-stock protected
- Location-validated
- Role-restricted

---

## ✅ Implemented Modules

### Week 1
- Project initialization
- JWT authentication system
- Password hashing (bcrypt)
- Protected backend routes
- Frontend login integration

### Week 2
- Role-based authorization middleware (protect + authorizeRoles)
- Global error handling middleware
- Yard management module (CRUD)
- Yard-level location structure
- Role-secured frontend dashboards
- ProtectedRoute component
- Unauthorized access page
- MongoDB connection validation improvement
- Clean Git commit structure

### Week 3
- Material module (CRUD + RBAC)
- Stock model (current balance tracking)
- StockMovement model (audit trail)
- Receive stock API
- Issue stock API with negative protection
- Transfer stock API (yard-to-yard)
- Stock query endpoint with filtering
- Transaction-based stock updates
- Default location auto-creation for yards
- Full inventory testing via Postman

---

## 🚀 Current Project Status

Authentication, RBAC, Yard, Material, and Inventory foundation modules are fully functional and tested.

The backend now supports:

- Multi-yard stock tracking
- Secure stock transactions (Receive / Issue / Transfer)
- Location-level inventory control
- Full audit trail via StockMovement model

---

## 🎯 Next Milestone

- Material Request (MR) workflow with approval system

---

## 👨‍💻 Developer

Hirusha Nilupul  
Final Year Student  
NSBM Green University