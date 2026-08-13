const moment = require("moment-timezone");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const getEarliestBookableInstant = (minBookingLeadHours = 0) =>
  moment()
    .tz(APP_TIMEZONE)
    .add(Number(minBookingLeadHours) || 0, "hours");

const getDateTimeInAppTz = (date, time = "00:00:00") =>
  moment.tz(
    `${date} ${time}`,
    ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"],
    true,
    APP_TIMEZONE,
  );

const isBeforeLeadTime = ({ date, time, minBookingLeadHours }) =>
  getDateTimeInAppTz(date, time).isBefore(
    getEarliestBookableInstant(minBookingLeadHours),
  );

module.exports = {
  APP_TIMEZONE,
  getEarliestBookableInstant,
  getDateTimeInAppTz,
  isBeforeLeadTime,
};
