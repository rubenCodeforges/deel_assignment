const { sequelize } = require('../model');
const { Op } = require('sequelize');
const ContractStatus = require('../enums/contract-status.enum');

// POST /balances/deposit/:userId - Deposits money into the the the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
const deposit = async (req, res) => {
  if (req.params === undefined || req.body === undefined) {
    // just in cases we want to handle this.
    res.status(400).send('Invalid Route Params');
  }
  const currentUserId = req.profile.id;
  const targetUserId = req.params.userId;
  const amountToTransfer = req.body.amount;
  const { Profile } = req.app.get('models');
  const { Contract } = req.app.get('models');
  const { Job } = req.app.get('models');

  // Working with finances requires the operations to be Atomic , therefore transactions will be used
  // For the sake of this task we will use unmanaged transactions
  const t = await sequelize.transaction();

  try {
    // Lets calculate first how much we can spend, assuming that a client can have multiple contracts and contracts can have multiple jobs,
    // we will calculate the sum of all jobs that correspond to criteria : only jobs from non terminated contracts belonging to the current user (based on profile_id header)
    let totalInReserve = 0;
    const reservedInJobs = await Job.findAll({
      attributes: [[sequelize.fn('sum', sequelize.col('price')), 'reserved']],
      raw: true,
      where: {
        '$Contract.ClientId$': currentUserId,
        '$Contract.status$': { [Op.ne]: ContractStatus.terminated },
      },
      include: [
        {
          model: Contract,
          as: 'Contract',
        },
      ],
    });

    if (reservedInJobs !== undefined && reservedInJobs.length > 0) {
      reservedInJobs.forEach((e) => (totalInReserve += e.reserved));
    }
    // Here i might be missunderstanding the requirements of the endpoint,
    // i would better ask, since requirements for money operations should be well-defined.
    const canTransfer = (100 * amountToTransfer) / totalInReserve <= 25;

    // If transfer amount exceeds allowed value rollout transaction and return meaningful message
    if (!canTransfer) {
      await t.rollback();
      res.status(400).send('Transfer amount exceeds allowed threshold');
    }

    // Im not sure if the balance is restricted or not , but i dont see any Constraints on balance column maybe it is allowed to go in negatives
    // if not we should do it another way.
    await Profile.decrement('balance', { by: amountToTransfer, where: { id: currentUserId } });
    await Profile.increment('balance', { by: amountToTransfer, where: { id: targetUserId } });

    await t.commit();
    //We can return anything we want , for now its a standard success status code 200
    res.sendStatus(200);
  } catch (error) {
    // lets just give a hint that the transaction failed, you can also return the error message if needed
    await t.rollback();
    res.status(400).send('Transaction Failed');
  }
};

module.exports = { deposit };
