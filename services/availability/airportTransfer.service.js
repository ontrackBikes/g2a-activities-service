const { checkTransferAvailability } = require("./transfer.service");

const checkAirportTransfer = ({ locations, ...args }) =>
  checkTransferAvailability({
    ...args,
    serviceName: "Airport transfer",
    locations,
    includeTransferType: true,
  });

module.exports = { checkAirportTransfer };
