const ROLES = {
  // Global roles
  GUEST: 'guest', // Not logged in
  USER: 'user', // Logged in
  ADMIN: 'admin', // Platform admin
  SUPPORT_AGENT: 'support_agent', // Support client agent
  OWNER: 'owner', // Hotel owner
  MANAGER: 'manager', // Hotel manager
  STAFF: 'staff', // Hotel staff
};

const VALID_ROLES = Object.values(ROLES);

const HOTEL_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
};

function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

function isValidHotelRole(role) {
  return Object.values(HOTEL_ROLES).includes(role);
}

module.exports = {
  ROLES,
  VALID_ROLES,
  HOTEL_ROLES,
  isValidRole,
  isValidHotelRole,
};
