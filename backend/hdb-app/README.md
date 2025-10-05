# HDB Finder Project

## Overview
The HDB Finder project is a web application designed to facilitate user registration and authentication. It consists of a frontend built with Next.js and a backend powered by Express.js. This project aims to provide a seamless experience for users looking to register and manage their accounts.

## Project Structure
The project is organized into two main directories: `backend` and `hdb-app`.

### Backend
- **src/app.ts**: Entry point of the backend application, setting up the Express server and middleware.
- **src/controllers/authController.ts**: Contains the `AuthController` class with methods for user registration and authentication.
- **src/routes/authRoutes.ts**: Defines authentication routes and links them to the `AuthController`.
- **src/models/userModel.ts**: Defines the user schema and methods for database interactions.
- **src/utils/db.ts**: Contains the database connection logic.
- **package.json**: Lists dependencies and scripts for the backend.
- **tsconfig.json**: TypeScript configuration for the backend.
- **README.md**: Documentation for the backend project.

### Frontend
- **src/app/(auth)/register/page.tsx**: Registration page that collects user input for registration.
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
   ```
2. Navigate to the backend directory and install dependencies:
   ```
   cd backend
   npm install
   ```
3. Navigate to the frontend directory and install dependencies:
   ```
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
   cd ../hdb-app
   npm run dev
   ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.