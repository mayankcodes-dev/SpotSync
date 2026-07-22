import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import { IUser } from '../models/user';

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}
