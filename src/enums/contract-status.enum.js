// Magic strings aint good, there for we better use consts
// Moved to separate file since it is required by more than one file and we dont want to make duplicated code.
const ContractStatus = {
  terminated: 'terminated',
  inProgress: 'in_progress',
  new: 'new',
};
module.exports = ContractStatus;
