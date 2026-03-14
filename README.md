# Job Tracker

A full-stack application designed to seamlessly streamline, manage, and track job application entries. Built as a monorepo, it leverages a modern TypeScript ecosystem to ensure type safety and scalability across both the client and server.

## 🚀 Tech Stack

### Frontend
- **Framework:** Next.js / React
- **Language:** TypeScript

### Backend
- **Environment:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Architecture:** REST API

### Database
- **Primary Database:** PostgreSQL

## 📦 Project Structure

This project utilizes a **monorepo** architecture configured via `package.json` workspaces. This setup allows for efficient code sharing, unified dependency management, and a streamlined developer experience between the frontend and backend applications.

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- Node.js
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/D3S-Gaurav/Job-Tracker.git](https://github.com/D3S-Gaurav/Job-Tracker.git)
   cd Job-Tracker
   ```

2. Install dependencies for the entire workspace from the root directory:
   ```bash
   npm install
   ```

3. Configure your environment variables. You will need to set up your PostgreSQL database credentials and server ports in the respective `.env` files for both the frontend and backend workspaces.

### Running the Application

To start the development servers, you can utilize the workspace scripts. The backend is configured to run with `nodemon` and `ts-node` for automatic reloading during development.

Start the backend server:
   ```bash
   npm run dev --workspace=backend
   ```

Start the frontend client:
   ```bash
   npm run dev --workspace=frontend
   ```
*(Note: Adjust the workspace names `backend` and `frontend` if they differ in your `package.json` workspace configuration).*

## ✨ Features

- **Application Management:** Add, update, view, and organize job applications in one centralized dashboard.
- **RESTful API:** Structured and reliable endpoints for scalable backend data management.
- **End-to-End Type Safety:** Comprehensive TypeScript integration across the stack reduces runtime errors and improves maintainability.
