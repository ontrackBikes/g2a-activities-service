const { checkTransferAvailability } = require("./transfer.service");
const cabServiceLocations = require("../../constants/cabServiceLocations");

const checkCabService = ({ locations = cabServiceLocations, ...args }) =>
  checkTransferAvailability({
    ...args,
    serviceName: "Cab service",
    locations,
  });

module.exports = { checkCabService };
