// GET /admin/best-profession?start=<date>&end=<date> - Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../model');

const getBestProfession = async (req, res) => {
  if (req.query === undefined) {
    // Maybe we should return the list without time boundaries but pagination should be a thing
  }
  // TODO: It would be wise to handle if one of the params is not provided.

  const start = req.query.start;
  const end = req.query.end;

  //Since the returned result differs from the models that are defined i will use a custom query
  //REMEMBER: Never use direct params concatenation or interpolation , always use the ORM to handle (sanitize) the params
  const query = `select P.profession, sum(price) as totalEarned, count(Jobs.paid) as amountOfJobsPaid
                    from Jobs
                             left join Contracts C on C.id = Jobs.ContractId
                             left join Profiles P on P.id = C.ContractorId
                    where paid not null and paymentDate BETWEEN $1 and $2
                    group by profession
                    order by totalEarned desc;`;
  // Since i was not sure in format the date will be send , im making sure it will be converted to proper ISO String format
  try {
    const result = await sequelize.query(query, {
      bind: [new Date(start).toISOString(), new Date(end).toISOString()],
      type: QueryTypes.SELECT,
    });
    if (result === undefined || result === null) {
      res.sendStatus(404);
    } else {
      res.send(result);
    }
  } catch (e) {
    // Something went wrong , so lets give some clues
    res.status(400).send(e);
  }
};

// GET /admin/best-clients?start=<date>&end=<date>&limit=<integer> - returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
const getBestClient = async (req, res) => {
  if (req.query === undefined) {
    // Maybe we should return the list without time boundaries but pagination should be a thing
  }
  // TODO: It would be wise to handle if one of the params is not provided.
  const start = req.query.start;
  const end = req.query.end;
  const limit = req.query.limit || 2;
  const { Profile } = req.app.get('models');

  //Since the returned result differs from the models that are defined i will use a custom query
  //REMEMBER: Never use direct params concatenation or interpolation , always use the ORM to handle (sanitize) the params
  const query = `select Profiles.*, sum(price) as totalPaid
                 from Profiles
                          left join Contracts C on Profiles.id = C.ClientId
                          left join Jobs J on C.id = J.ContractId

                 where J.paid not null and paymentDate BETWEEN $1 and $2
                 group by Profiles.id
                 order by totalPaid DESC
                 LIMIT $3`;
  // Since i was not sure in format the date will be send , im making sure it will be converted to proper ISO String format
  try {
    const result = await sequelize.query(query, {
      bind: [new Date(start).toISOString(), new Date(end).toISOString(), limit],
      type: QueryTypes.SELECT,
      model: Profile,
    });
    if (result === undefined || result === null) {
      res.sendStatus(404);
    } else {
      res.send(result);
    }
  } catch (e) {
    // Something went wrong , so lets give some clues
    res.status(400).send(e);
  }
};

module.exports = { getBestProfession, getBestClient };
