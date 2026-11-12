const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const authService = {
  async login(email, password) {
    if (!email || !password) {
      const err = new Error('Email dan password wajib diisi');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const emailMatch = email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
    let passwordMatch = false;

    if (emailMatch) {
      if (password === env.ADMIN_PASSWORD) {
        passwordMatch = true;
      } else if (env.ADMIN_PASSWORD.startsWith('$2a$') || env.ADMIN_PASSWORD.startsWith('$2b$')) {
        passwordMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD);
      }
    }

    if (!emailMatch || !passwordMatch) {
      const err = new Error('Email atau password salah');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const payload = {
      sub: 'admin-1',
      email: env.ADMIN_EMAIL,
      role: 'admin',
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '8h',
    });

    return {
      token,
      user: {
        email: env.ADMIN_EMAIL,
        role: 'admin',
      },
    };
  },
};

module.exports = authService;

