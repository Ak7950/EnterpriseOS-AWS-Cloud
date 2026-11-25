
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DEVELOPMENT_SECRET = 'development-secret-change-me-123456789';

export const validateJwtSecret = () => {
  const value = process.env.JWT_SECRET?.trim();

  if (!value) {
    throw new Error('JWT_SECRET is required. Configure it in the environment.');
  }

  if (value.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  if (process.env.NODE_ENV === 'production' && value === DEVELOPMENT_SECRET) {
    throw new Error('The development JWT secret cannot be used in production.');
  }

  return value;
};

export const hash = password => bcrypt.hash(password, 12);

export const verifyPassword = (password, hashed) =>
  bcrypt.compare(password, hashed);

export const tokenFor = user =>
  jwt.sign(
    {
      sub: user.id,
      org: user.organization_id,
      role: user.role,
      passwordChangeRequired: Boolean(user.must_change_password),
      name: `${user.first_name} ${user.last_name}`
    },
    validateJwtSecret(),
    { expiresIn: '8h' }
  );

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'UNAUTHENTICATED'
    });
  }

  try {
    req.user = jwt.verify(token, validateJwtSecret());
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Session is invalid or expired',
      errorCode: 'INVALID_TOKEN'
    });
  }
}

export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({
        success: false,
        message: 'You are not authorized to perform this action',
        errorCode: 'FORBIDDEN'
      });
