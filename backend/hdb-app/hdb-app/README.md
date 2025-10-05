# HDB Finder Project

## Overview
The HDB Finder project is a web application designed to facilitate user registration and authentication. It consists of a frontend built with Next.js and a backend powered by Express.js. This project aims to provide a seamless experience for users looking to register and manage their accounts.

## Project Structure
The project is organized into two main directories: `backend` and `hdb-app`. 

### Backend
- **src/app.ts**: Entry point of the backend application, setting up the Express server and middleware.
- **src/controllers/authController.ts**: Contains the `AuthController` class with methods for user registration and authentication.
- **src/routes/authRoutes.ts**: Defines authentication routes and links them to the `AuthController`.
- **src/models/userModel.ts**: Defines the user schema and methods for database interaction.
- **src/utils/db.ts**: Contains the database connection logic.
- **package.json**: Lists dependencies and scripts for the backend.
- **tsconfig.json**: TypeScript configuration for the backend.
- **README.md**: Documentation for the backend project.

### Frontend (hdb-app)
- **src/app/(auth)/register/page.tsx**: Registration page for user input.
- **package.json**: Lists dependencies and scripts for the frontend.
- **tsconfig.json**: TypeScript configuration for the frontend.
- **README.md**: Documentation for the frontend project.

## Getting Started

### Prerequisites
- Node.js
- npm or yarn
- A MongoDB database (or any other database of your choice)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd hdb-app
   ```

2. Install dependencies for both backend and frontend:
   ```
   cd backend
   npm install
   cd ../hdb-app
   npm install
   ```

### Running the Application
1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Start the frontend application:
   ```
   cd hdb-app
   npm run dev
   ```

### Usage
- Navigate to the frontend application in your browser (usually at `http://localhost:3000`).
- Use the registration page to create a new account.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.