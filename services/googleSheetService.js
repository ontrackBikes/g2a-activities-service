const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid"); // To generate orderId
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const moment = require("moment");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// Spreadsheet ID
const SPREADSHEET_ID = process.env.SPREAD_SHEET_ID;
const SHEET_NAME = "Orders"; // Sheet where orders will be logged

async function appendOrder(order) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const now = new Date().toISOString();

  // ✅ Write the correct pickup/drop value based on type
  const pickupDisplay =
    order.pickupType === "hotel"
      ? `Hotel: ${order.pickupHotelName || ""}`
      : `Self Pickup: ${order.pickup || ""}`;

  const dropDisplay =
    order.dropType === "hotel"
      ? `Hotel: ${order.dropHotelName || ""}`
      : `Self Drop: ${order.drop || ""}`;

  const row = [
    order.orderId,
    order.productType,
    order.locationName,
    order.startDate,
    order.endDate,
    order.quantity,
    moment(order.endDate).diff(moment(order.startDate), "days"),
    order.pricing.paymentType,
    order.pricing.amountPerDay,
    order.pricing.total,
    pickupDisplay, // ✅ was: order.pickup
    dropDisplay, // ✅ was: order.drop
    order.pickupTime || "", // ← ADD THIS (column 13: Pickup Time)
    order.dropTime || "", // ← ADD THIS (column 14: Drop Time)
    order.customer.title,
    order.customer.firstName,
    order.customer.lastName,
    order.customer.countryCode,
    order.customer.mobile,
    order.customer.email,
    order.customer.alternatePhone || "",
    now,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });

  return { success: true, orderId: order.orderId };
}

/**
 * Create order with backend-calculated pricing
 */
async function createOrder({
  productType,
  locationName,
  startDate,
  endDate,
  quantity,
  pickupType, // ✅ added
  dropType, // ✅ added
  pickup, // ✅ was defaulting to true — wrong
  drop, // ✅ was defaulting to true — wrong
  pickupHotelName, // ✅ added
  dropHotelName, // ✅ added
  pickupTime, // ← ADD THIS
  dropTime, // ← ADD THIS
  customer,
  pricing,
}) {
  const orderId = `ORD-${uuidv4().split("-")[0]}`;

  const order = {
    orderId,
    productType,
    locationName,
    startDate,
    endDate,
    quantity,
    pickupType, // ✅ added
    dropType, // ✅ added
    pickup, // ✅ now correctly undefined when hotel
    drop, // ✅ now correctly undefined when hotel
    pickupHotelName, // ✅ added
    dropHotelName, // ✅ added
    pickupTime, // ← ADD THIS
    dropTime, // ← ADD THIS
    customer,
    pricing,
    createdAt: new Date().toISOString(),
  };

  return appendOrder(order);
}

const PAYMENT_SHEET_NAME = "Payments"; // Sheet where orders will be logged

async function logPayment({
  orderId,
  razorpayOrderId,
  paymentId,
  amount,
  currency,
  status,
  notes,
  paidAt,
}) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const row = [
    orderId,
    razorpayOrderId,
    paymentId,
    amount,
    currency,
    status,
    JSON.stringify(notes),
    paidAt,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: PAYMENT_SHEET_NAME,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [row],
    },
  });

  return { success: true };
}

module.exports = {
  createOrder,
  logPayment,
};
