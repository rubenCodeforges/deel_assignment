const express = require('express');
const router = express.Router();

//TODO Better to have proper auth with JWT token
const { getProfile } = require('./middleware/getProfile');
const contractsCtrl = require('./controllers/contracts.controller');
const jobsCtrl = require('./controllers/jobs.controller');
const balanceCtrl = require('./controllers/balances.controller');
const adminCtrl = require('./controllers/admin.controller');

router.get('/', (req, res) => res.json({ message: 'Wizards are working here' }));
router.get('/contracts', getProfile, contractsCtrl.getAllContracts);
router.get('/contracts/my', getProfile, contractsCtrl.getAllMyContracts);
router.get('/contracts/:id', getProfile, contractsCtrl.getContractWithRelation);
router.get('/jobs/unpaid', getProfile, jobsCtrl.getUnpaidJobsForActiveContracts);
router.post('/jobs/:job_id/pay', getProfile, jobsCtrl.doPay);
router.post('/balances/deposit/:userId', getProfile, balanceCtrl.deposit);
// TODO: ACL would be crucial for any admin endpoints
router.get('/admin/best-profession', getProfile, adminCtrl.getBestProfession);
router.get('/admin/best-clients', getProfile, adminCtrl.getBestClient);

module.exports = router;
