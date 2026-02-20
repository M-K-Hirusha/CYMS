# CYMS - Construction Yard Management System

Final Year Project  
NSBM Green University  

---

## 📌 Project Overview

CYMS (Construction Yard Management System) is a full-stack web application designed to manage construction yard operations across multiple locations.

The system supports:

- Multi-yard inventory management
- Material and equipment tracking
- Stock movements (In / Out / Transfers)
- Project-based material allocation
- Role-based access control
- Secure authentication and authorization

---

## 🏗 System Architecture

The project follows a clean backend-first architecture using:

- RESTful API design
- Middleware-based security layer
- Role-based access control (RBAC)
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

---

## 🔐 Role Structure

The system currently supports:

- HEAD_OFFICE_ADMIN
- SITE_ADMIN
- MANAGER
- STAFF

Each role has controlled access to specific API routes and dashboards.

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
- Manager-to-yard assignment logic
- Role-secured frontend dashboards
- ProtectedRoute component
- Unauthorized access page
- MongoDB connection validation improvement
- Clean Git commit structure

---

## 🚀 Current Project Status

Authentication & Yard Management modules are fully functional and secured.

The system now provides a stable foundation for:

- Inventory tracking
- Stock transactions
- Material allocation workflows

## Developer

Hirusha Nilupul 
Final Year Student  
NSBM Green University
