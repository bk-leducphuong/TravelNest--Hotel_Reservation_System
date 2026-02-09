const express = require('express');
const bodyParser = require('body-parser');
// const { createAccount, createPayout, createAccountLink, checkAccountExist, getInvoices } = require('../../controllers/admin/payoutController');
const { authenticate } = require('@middlewares/auth.middleware');
const router = express.Router();

// root route: /api/admin/payout

router.use(authenticate);

// Create connect account
//Route to check if user already has an account
// router.get('/check-account-exist', checkAccountExist);
// // Route to create connect account link
// router.post('/create-account-link', createAccountLink)
// // Route to create connect account for owner
// router.post('/create-connect-account', createAccount );
//
// // Get all invoices
// router.post('/', getInvoices);
// // Route to create payout
// router.post('/create-payout', createPayout);

module.exports = router;
