const PAYMENT_METHODS = [
  'card',
  'bank_transfer',
  'wallet',
  'cash',
  'gift_card',
];

const PAYMENT_STATUSES = [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
];

function isValidPaymentMethod(method) {
  return PAYMENT_METHODS.includes(method);
}

function isValidPaymentStatus(status) {
  return PAYMENT_STATUSES.includes(status);
}

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  isValidPaymentMethod,
  isValidPaymentStatus,
};
