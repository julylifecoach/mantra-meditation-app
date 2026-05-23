const jwt = require('jsonwebtoken');

/**
 * Optional JWT authentication middleware.
 * If a valid Bearer token is present, extracts userId and userRole onto req.
 * If no token or an invalid token is provided, sets req.userId = null and
 * continues without rejecting the request.
 *
 * Use this for endpoints that work anonymously but gain features when
 * the caller is authenticated (e.g. linking a quiz result to a user).
 */
const optionalAuth = (req, res, next) => {
    req.userId = null;
    req.userRole = null;

    // Check Authorization header first, then fall back to cookie
    const authHeader = req.headers.authorization;
    let token = authHeader ? authHeader.split(' ')[1] : null;

    if (!token && req.cookies && req.cookies.july_token) {
        token = req.cookies.july_token;
    }

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
    } catch (e) {
        // Token invalid or expired -- treat as unauthenticated
    }

    next();
};

module.exports = { optionalAuth };
