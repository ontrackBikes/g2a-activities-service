const { checkTransferAvailability } = require("./transfer.service");

const checkCabService = ({ locations, ...args }) =>
  checkTransferAvailability({
    ...args,
    serviceName: "Cab service",
    locations,
  });

module.exports = { checkCabService };
