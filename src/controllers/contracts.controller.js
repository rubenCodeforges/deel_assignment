const { Op } = require('sequelize');
const ContractStatus = require('../enums/contract-status.enum');

// GET /contracts - Returns a list of contracts, the list should only contain non terminated contracts.
// From the requirements it was not clear if the list should be fetched for the current
// user or in general all entries where FKs are not null, or maybe at least one FK should be given
// Anyhow here is a general list and one additional for current user.

// TODO: it is recommended to have a Pagination for big list,
//  unrestricted lists can lead to memory leaks and performance impact.

const getAllContracts = async (req, res) => {
  const { Contract } = req.app.get('models');
  const contracts = await Contract.findAll({
    where: {
      status: {
        [Op.ne]: ContractStatus.terminated,
      },
      //TODO: It was not exactly clear why FK are not constraint to be not null,
      // this can be dropped if FK is set to "allowNull: false"
      ClientId: { [Op.not]: null },
      ContractorId: { [Op.not]: null },
    },
  });

  res.send(contracts);
};

// GET /contracts/my - Returns a list of contracts belonging to a user
// Since the requirement was not exactly clear , here is another list for the current "Authorized" User
// Assuming ContractorId and ClientId both are pointing to the "Profiles".
// Then this should return a list of all Contracts that are not terminated and that are belonging to the current "Authorized" user either of ContractorID or ClientId.
const getAllMyContracts = async (req, res) => {
  const { Contract } = req.app.get('models');
  const userId = req.profile.id;
  const contracts = await Contract.findAll({
    where: {
      status: {
        [Op.ne]: ContractStatus.terminated,
      },
      [Op.or]: [
        {
          ClientId: userId,
        },
        {
          ContractorId: userId,
        },
      ],
    },
  });

  res.send(contracts);
};

// GET /contracts/:id - This API is broken 😵! it should return the contract only if it belongs to the profile calling. better fix that!
// Assuming we are talking about that we should fetch specific contract (by ID) only if that contract belongs to the "authorized" profile.
// Given in to account that Client and Contractor are "Profiles" we will query where ClientId or ContractorId matches with "Authorized" profile id.
const getContractWithRelation = async (req, res) => {
  if (req.params === undefined) {
    // just in cases we want to handle this.
    res.status(400).send('Invalid Route Params');
  }
  const contractId = req.params.id;
  const { Contract } = req.app.get('models');
  const userId = req.profile.id;
  const contract = await Contract.findOne({
    where: {
      id: contractId,
      [Op.or]: [{ ClientId: userId }, { ContractorId: userId }],
    },
  });

  if (contract === null || contract === undefined) {
    res.sendStatus(404);
  } else {
    res.send(contract);
  }
};

module.exports = { getAllContracts, getAllMyContracts, getContractWithRelation };
