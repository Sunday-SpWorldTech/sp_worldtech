const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

function normalizeRole(role) {
  return role === 'social_worker' ? 'staff' : role;
}

function authorize(...roles) {
  return (req, res, next) => {
    const actualRole = normalizeRole(req.user.role);
    const allowedRoles = roles.map(normalizeRole);
    const ownerCanUseAdminRoutes = actualRole === 'owner' && allowedRoles.includes('admin');
    if (!allowedRoles.includes(actualRole) && !ownerCanUseAdminRoutes) {
      return res.status(403).json({ message: 'Access denied' });
    }
    req.user.role = actualRole;
    next();
  };
}

module.exports = { protect, authorize, normalizeRole };
