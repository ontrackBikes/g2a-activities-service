const { checkTransferAvailability } = require("./transfer.service");
const airportTransferLocations = require("../../constants/airportTransferLocations");

const checkAirportTransfer = (args) =>
  checkTransferAvailability({
    ...args,
    serviceName: "Airport transfer",
    locations: airportTransferLocations,
    includeTransferType: true,
  });

module.exports = { checkAirportTransfer };
