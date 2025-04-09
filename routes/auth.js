const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const logger = require('../config/logger');


// POST /login - Handle user login
router.post('/login', (req, res, next) => {
  logger.info(`Login attempt for email: ${req.body.email}`);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.error('Error during login:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      logger.warn(`Login failed for email: ${req.body.email} - ${info.message}`);
      return res.status(401).json({ error: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        logger.error('Error logging in user:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      logger.info(`User logged in: ${user.email} (ID: ${user._id})`);
      const userData = {
        ...user.toObject(),
        id: user._id.toString(),
        _id: undefined,
      };
      res.json(userData);
    });
  })(req, res, next);
});


// POST /register - Handle user registration
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in registration:', errors.array().map(e => e.msg));
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      logger.info(`User registration attempt: ${req.body.email}`);
      const { name, email, password } = req.body;
      const existingUser = await User.findOne({ email });
  
      if (existingUser) {
        logger.warn(`User already exists: ${email}`);
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role: 'user',
      });
      await newUser.save();
  
      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          logger.error('Error logging in user after registration:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        logger.info(`User registered and logged in: ${email} (ID: ${newUser._id})`);
        res.status(201).json(newUser);
      });
    } catch (err) {
      logger.error('Error during registration:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
// PUT /user/:id - Update user profile
router.put('/user/:id', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in user update:', errors.array().map(e => e.msg));
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      logger.info(`Updating user with ID: ${req.params.id}`);
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          zipCode: req.body.zipCode,
          country: req.body.country,
        },
        { new: true }
      );
      if (!updatedUser) {
        logger.warn(`User with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      logger.info(`Updated user: ${updatedUser.email} (ID: ${updatedUser._id})`);
      res.json(updatedUser);
    } catch (err) {
      logger.error(`Error updating user with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/user', (req, res) => {
    if (req.user) {
      logger.info(`Fetching current user: ${req.user.email} (ID: ${req.user._id})`);
      const userData = {
        ...req.user.toObject(),
        id: req.user._id.toString(),
        _id: undefined,
      };
      res.json(userData);
    } else {
      logger.info('No authenticated user found');
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  router.post('/logout', (req, res) => {
    if (req.isAuthenticated()) {
      const email = req.user.email;
      req.logout((err) => {
        if (err) {
          logger.error('Error during logout:', err);
          return res.status(500).json({ error: 'Server error during logout' });
        }
        req.session.destroy(() => {
          logger.info(`User logged out: ${email}`);
          res.json({ message: 'Logged out successfully' });
        });
      });
    } else {
      logger.warn('Logout attempted without an authenticated session');
      res.status(400).json({ error: 'No user is currently logged in' });
    }
  });
  

module.exports = router;