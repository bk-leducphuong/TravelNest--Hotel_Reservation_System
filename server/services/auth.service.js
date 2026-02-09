const bcrypt = require('bcryptjs');
const authRepository = require('@repositories/auth.repository');
const ApiError = require('@utils/ApiError');
const { isValidRole } = require('@constants/roles');
const {
  isValidEmailFormat,
  validateEmail,
  validateEmailDomain,
} = require('@utils/emailValidation.js');

/**
 * Auth Service - Contains main business logic for authentication
 * Follows RESTful API standards
 */

class AuthService {
  /**
   * Check if email exists with specific role
   * @param {string} email - Email address
   * @param {string} roleName - Role name (guest, hotel_manager, hotel_staff, admin, support_agent)
   * @returns {Promise<Object>} Object with exists flag
   */
  async checkEmail(email, roleName) {
    // Validate role name
    if (!isValidRole(roleName)) {
      throw new ApiError(400, 'INVALID_ROLE', 'Invalid role name');
    }

    // Validate email format
    if (!isValidEmailFormat(email)) {
      throw new ApiError(400, 'INVALID_EMAIL_FORMAT', 'Invalid email format');
    }

    // Validate email domain
    if (!(await validateEmailDomain(email))) {
      throw new ApiError(400, 'INVALID_EMAIL_DOMAIN', 'Invalid email domain');
    }

    // Check if user exists with this role
    const user = await authRepository.findByEmailAndRole(email, roleName);

    if (user) {
      return { exists: true };
    }

    // Validate active email
    if (!(await validateEmail(email))) {
      throw new ApiError(400, 'EMAIL_NOT_EXISTS', 'Email does not exist');
    }

    return { exists: false };
  }

  /**
   * Login user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {string} roleName - Role name
   * @returns {Promise<Object>} User data for session
   */
  async login(email, password, roleName) {
    // Validate role name
    if (!isValidRole(roleName)) {
      throw new ApiError(400, 'INVALID_ROLE', 'Invalid role name');
    }

    const user = await authRepository.findByEmailAndRoleWithPassword(
      email,
      roleName
    );

    if (!user) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    // Check user status
    if (user.status !== 'active') {
      throw new ApiError(
        403,
        'ACCOUNT_INACTIVE',
        `Account is ${user.status}. Please contact support.`
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    // Update last login timestamp
    await authRepository.updateLastLogin(user.id);

    // Get full user data with context
    const userWithContext = await authRepository.getUserWithContext(user.id);

    return {
      userId: user.id,
      userRole: user.role,
      userData: userWithContext,
    };
  }

  /**
   * Register new user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @param {string} roleName - Role name
   * @returns {Promise<Object>} Created user data
   */
  async register(email, password, firstName, lastName, roleName) {
    // Validate role name
    if (!isValidRole(roleName)) {
      throw new ApiError(400, 'INVALID_ROLE', 'Invalid role name');
    }

    // Check if user already exists (any role)
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      // Check if user already has this specific role
      const hasRole = existingUser.roles?.some(
        (ur) => ur.role.name === roleName
      );
      if (hasRole) {
        throw new ApiError(409, 'USER_ALREADY_EXISTS', 'User already exists');
      }
      // User exists but doesn't have this role - assign it
      const role = await authRepository.findRoleByName(roleName);
      if (!role) {
        throw new ApiError(500, 'ROLE_NOT_FOUND', 'Role not found in system');
      }
      await authRepository.assignRoleToUser(existingUser.id, role.id);

      // Get full user data with context
      const userWithContext = await authRepository.getUserWithContext(
        existingUser.id
      );

      return {
        userId: existingUser.id,
        userRole: roleName,
        userData: userWithContext,
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get role
    const role = await authRepository.findRoleByName(roleName);
    if (!role) {
      throw new ApiError(500, 'ROLE_NOT_FOUND', 'Role not found in system');
    }

    // Create user
    const newUser = await authRepository.createUser({
      email: email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      status: 'active',
    });

    // Assign role to user
    await authRepository.assignRoleToUser(newUser.id, role.id);

    // Get full user data with context
    const userWithContext = await authRepository.getUserWithContext(newUser.id);

    return {
      userId: newUser.id,
      userRole: roleName,
      userData: userWithContext,
    };
  }
}

module.exports = new AuthService();
