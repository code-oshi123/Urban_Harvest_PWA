import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';
const TOKEN_EXPIRY = '7d';

// Hash password
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Verify password
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
export const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Auth middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
};