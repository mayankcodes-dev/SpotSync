jest.mock('../../models/user');

import { Request, Response, NextFunction } from 'express';
import * as usersController from '../../controllers/users';
import User from '../../models/user';

const mockReq = (overrides = {}): Partial<Request> => ({
  params: {},
  body: {},
  flash: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  session: {} as any,
  ...overrides,
});

const mockRes = (): Partial<Response> => ({
  render: jest.fn(),
  redirect: jest.fn(),
  locals: {} as any,
});

const mockNext: NextFunction = jest.fn();

describe('Users Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderRegister', () => {
    it('should render register page', () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;

      usersController.renderRegister(req, res);

      expect(res.render).toHaveBeenCalledWith('users/register', { activePage: 'register' });
    });
  });

  describe('renderLogin', () => {
    it('should render login page', () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;

      usersController.renderLogin(req, res);

      expect(res.render).toHaveBeenCalledWith('users/login', { activePage: 'login' });
    });
  });

  describe('login', () => {
    it('should flash success and redirect after login', () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;
      res.locals = { returnTo: '/campgrounds' } as any;

      usersController.login(req, res);

      expect(req.flash).toHaveBeenCalledWith('success', 'Welcome Back!');
      expect(res.redirect).toHaveBeenCalledWith('/campgrounds');
    });

    it('should redirect to /campgrounds if no returnTo stored', () => {
      const req = mockReq() as Request;
      const res = mockRes() as Response;
      res.locals = {} as any;

      usersController.login(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/campgrounds');
    });
  });

  describe('logout', () => {
    it('should call req.logout and redirect', () => {
      const mockLogout = jest.fn((callback) => callback(null));
      const req = mockReq({ logout: mockLogout }) as Request;
      const res = mockRes() as Response;

      usersController.logout(req, res, mockNext);

      expect(mockLogout).toHaveBeenCalled();
      expect(req.flash).toHaveBeenCalledWith('success', 'Goodbye!');
      expect(res.redirect).toHaveBeenCalledWith('/campgrounds');
    });

    it('should call next(err) if logout fails', () => {
      const logoutError = new Error('Logout failed');
      const mockLogout = jest.fn((callback) => callback(logoutError));
      const req = mockReq({ logout: mockLogout }) as Request;
      const res = mockRes() as Response;

      usersController.logout(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(logoutError);
    });
  });

  describe('register', () => {
    it('should register user and redirect to campgrounds on success', async () => {
      const mockUser = { _id: 'user123', username: 'testuser', email: 'test@example.com' };
      (User as any).mockImplementation(() => mockUser);
      (User as any).register = jest.fn().mockResolvedValue(mockUser);

      const mockLogin = jest.fn((user, callback) => callback(null));
      const req = mockReq({
        body: { username: 'testuser', email: 'test@example.com', password: 'password123' },
        login: mockLogin,
      }) as Request;
      const res = mockRes() as Response;

      await usersController.register(req, res);

      expect(req.flash).toHaveBeenCalledWith('success', 'Welcome to SpotSync!');
      expect(res.redirect).toHaveBeenCalledWith('/campgrounds');
    });

    it('should flash error and redirect to /register on failure', async () => {
      (User as any).mockImplementation(() => ({}));
      (User as any).register = jest.fn().mockRejectedValue(new Error('Username already exists'));

      const req = mockReq({
        body: { username: 'existing', email: 'test@example.com', password: 'password' },
      }) as Request;
      const res = mockRes() as Response;

      await usersController.register(req, res);

      expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('Username'));
      expect(res.redirect).toHaveBeenCalledWith('/register');
    });
  });
});
