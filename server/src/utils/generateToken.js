const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  const isUser = role === 'customer';
  const secret = isUser ? process.env.JWT_SECRET : process.env.JWT_ADMIN_SECRET;
  const expiresIn = isUser ? process.env.JWT_EXPIRES_IN : process.env.JWT_ADMIN_EXPIRES_IN;
  
  return jwt.sign({ userId, role }, secret, {
    expiresIn,
  });
};

module.exports = generateToken;
