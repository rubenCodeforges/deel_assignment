const Sequelize = require('sequelize');

const isProdEnv = true || process.env.NODE_ENV === 'production';

// on Dev env better to have extended logging capabilities and benchmark
const logConfig = {
  benchmark: true,
  logging: (...msg) => console.log(msg),
  logQueryParameters: true,
};

let sequelizeConfig = {
  dialect: 'sqlite',
  storage: './database.sqlite3',
};

if (!isProdEnv) {
  sequelizeConfig = {
    ...sequelizeConfig,
    ...logConfig,
  };
}

//TODO: A hint for many READ operations, replicas could be used if there is a heavy usage of READ operations (SELECT)
// This will allow to distribute SELEC requests between different DB Replicas, a significant performance boost can be expected.
const sequelize = new Sequelize(sequelizeConfig);

class Profile extends Sequelize.Model {}
Profile.init(
  {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    profession: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    balance: {
      type: Sequelize.DECIMAL(12, 2),
    },
    type: {
      type: Sequelize.ENUM('client', 'contractor'),
    },
  },
  {
    sequelize,
    modelName: 'Profile',
  },
);

class Contract extends Sequelize.Model {}
Contract.init(
  {
    terms: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('new', 'in_progress', 'terminated'),
    },
  },
  {
    sequelize,
    modelName: 'Contract',
  },
);

class Job extends Sequelize.Model {}
Job.init(
  {
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    },
    paid: {
      type: Sequelize.BOOLEAN,
      default: false,
    },
    paymentDate: {
      type: Sequelize.DATE,
    },
  },
  {
    sequelize,
    modelName: 'Job',
  },
);
Profile.hasMany(Contract, { as: 'Contractor', foreignKey: 'ContractorId' });
Contract.belongsTo(Profile, { as: 'Contractor' });
Profile.hasMany(Contract, { as: 'Client', foreignKey: 'ClientId' });
Contract.belongsTo(Profile, { as: 'Client' });
Contract.hasMany(Job);
Job.belongsTo(Contract);

module.exports = {
  sequelize,
  Profile,
  Contract,
  Job,
};
