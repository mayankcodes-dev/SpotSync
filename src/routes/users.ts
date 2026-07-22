import express from 'express';
import catchAsync from '../utils/catchAsync';
import * as users from '../controllers/users';
import passport from 'passport';
import { storeReturnTo } from '../middleware';
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit';

const router = express.Router();

router.route('/register')
  .get(users.renderRegister)
  .post(registerRateLimit, catchAsync(users.register));

router.route('/login')
  .get(users.renderLogin)
  .post(loginRateLimit, storeReturnTo, passport.authenticate('local', {
    failureFlash: true,
    failureRedirect: '/login',
  }), users.login);

router.get('/logout', users.logout);

export default router;
