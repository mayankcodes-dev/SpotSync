import { Request, Response, NextFunction } from 'express';
import User from '../models/user';

export const renderRegister = (req: Request, res: Response): void => {
  res.render('users/register', { activePage: 'register' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email });
    const registeredUser = await (User as any).register(user, password);
    req.login(registeredUser, (err: Error) => {
      if (err) {
        req.flash('error', err.message);
        res.redirect('/register');
        return;
      }
      req.flash('success', 'Welcome to SpotSync!');
      res.redirect('/spots');
    });
  } catch (e: any) {
    req.flash('error', e.message);
    res.redirect('/register');
  }
};

export const renderLogin = (req: Request, res: Response): void => {
  res.render('users/login', { activePage: 'login' });
};

export const login = (req: Request, res: Response): void => {
  req.flash('success', 'Welcome Back!');
  const redirectUrl = res.locals.returnTo || '/spots';
  res.redirect(redirectUrl);
};

export const logout = (req: Request, res: Response, next: NextFunction): void => {
  req.logout(function (err: Error) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Goodbye!');
    res.redirect('/spots');
  });
};
