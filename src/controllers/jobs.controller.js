const { Op } = require('sequelize');
const ContractStatus = require('../enums/contract-status.enum');
const { sequelize } = require('../model');

// GET /jobs/unpaid - Get all unpaid jobs for a user (either a client or contractor), for active contracts only.
const getUnpaidJobsForActiveContracts = async (req, res) => {
  const { Job } = req.app.get('models');
  const { Contract } = req.app.get('models');

  const userId = req.profile.id;

  const jobs = await Job.findAll({
    where: {
      paid: { [Op.eq]: null },
      '$Contract.status$': { [Op.ne]: ContractStatus.terminated },
      [Op.or]: [
        {
          '$Contract.ClientId$': userId,
        },
        {
          '$Contract.ContractorId$': userId,
        },
      ],
    },
    include: [
      {
        model: Contract,
        as: 'Contract',
        // The requirement doesn't say we should keep the eager relation so we will not show it.
        attributes: [],
      },
    ],
  });

  res.send(jobs);
};
// POST /jobs/:job_id/pay - Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
// This operation has to be atomic , we dont want to lose money in the process if something fails so a "transaction" has to be used here
const doPay = async (req, res) => {
  if (req.params === undefined) {
    // just in cases we want to handle this.
    res.status(400).send('Invalid Route Params');
  }

  const { Job } = req.app.get('models');
  const { Contract } = req.app.get('models');

  // For the sake of this task we will use unmanaged transactions
  const t = await sequelize.transaction();
  try {
    // Lets first find the required data with all its relation
    // Ive added additional restrictions where paid should be null , meaning the job is not paid yet i might be mistaken due to lack of additional information.
    const job = await Job.findOne({
      where: {
        id: req.params.job_id,
        paid: null,
      },
      include: {
        model: Contract,
        include: { all: true },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (job !== null) {
      const contract = job.Contract;
      const contractor = contract.Contractor;
      const client = contract.Client;
      // proceed only if client has enough money
      // TODO: i would also check if the Contract is not terminated
      if (client.balance >= job.price) {
        // It is not clear what paid exactly is , from model description its Bool but in the DB its a tinyint,
        // i assume it is a boolean int representation so 0 or 1 or even NULL
        job.paid = 1;
        job.paymentDate = Date.now();
        client.balance -= job.price;
        contractor.balance += job.price;
        // TODO We might also want to update the contract status but i dont see a "completed" status and the doc does not describe the behaviour of contract
        await client.save({ transaction: t });
        await contractor.save({ transaction: t });
        await job.save({ transaction: t });
        await t.commit();
        res.sendStatus(200);
      } else {
        // Looks like the client has not enough money
        // Let return a error with a message, for this task we send a status code with message, but it can also be a json
        await t.rollback();
        res.status(400).send('Client has insufficient balance');
      }
    } else {
      // Assuming the Job predicate returned no result , we are in a error state and should cancel the transaction and give some meaning full error
      // For the sake of this test i will return a 404
      await t.rollback();
      res.sendStatus(404);
    }
  } catch (error) {
    // lets just give a hint that the transaction failed, you can also return the error message if needed
    await t.rollback();
    res.status(400).send('Transaction Failed');
  }
};

module.exports = { getUnpaidJobsForActiveContracts, doPay };
