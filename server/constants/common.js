const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'HKD',
  'IDR',
  'INR',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'SGD',
  'THB',
  'TRY',
  'ZAR',
];

function isValidCurrency(currency) {
  return CURRENCIES.includes(currency);
}

module.exports = {
  CURRENCIES,
  isValidCurrency,
};
