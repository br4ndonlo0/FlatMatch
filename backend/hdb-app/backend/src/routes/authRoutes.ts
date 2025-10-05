import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();
const authController = new AuthController();

export function setAuthRoutes(app: Router) {
  app.post('/api/register', authController.registerUser.bind(authController));
}