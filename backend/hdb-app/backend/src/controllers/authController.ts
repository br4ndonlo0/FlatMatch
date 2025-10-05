import { Request, Response } from 'express';
import User from '../models/userModel';

class AuthController {
  async registerUser(req: Request, res: Response) {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const user = new User({ username, password });
      await user.createUser();
      return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
}

export default new AuthController();