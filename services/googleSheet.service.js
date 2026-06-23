const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const moment = require("moment");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// ---------------------------------------------------------------------------
// Sheet config — one entry per product type.
// Add a new product here when you introduce it; each can point to its own
// spreadsheet and use whatever tab names make sense.
// ---------------------------------------------------------------------------
const SHEET_CONFIG = {
  "bike-rentals": {
    spreadsheetId:
      process.env.SPREAD_SHEET_ID_BIKE_RENTALS || process.env.SPREAD_SHEET_ID,
    ordersSheet: "Orders",
    paymentsSheet: "Payments",
  },
  // "ferry-tickets": {
  //   spreadsheetId: process.env.SPREAD_SHEET_ID_FERRY,
  //   ordersSheet: "Orders",
  //   paymentsSheet: "Payments",
  // },
};

// ---------------------------------------------------------------------------
// Internal — appends a fully-formed order row to the correct sheet
// ---------------------------------------------------------------------------
async function appendOrder(order) {
  const config = SHEET_CONFIG[order.productType];

  if (!config) {
    console.error(
      `❌ appendOrder: no sheet config for productType "${order.productType}"`,
    );
    return { success: false, reason: "Unknown productType" };
  }

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const now = new Date().toISOString();

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
    pickupDisplay,
    dropDisplay,
    order.pickupTime || "",
    order.dropTime || "",
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
    spreadsheetId: config.spreadsheetId,
    range: config.ordersSheet,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });

  return { success: true, orderId: order.orderId };
}

// ---------------------------------------------------------------------------
// Public — create order row in the sheet and return the generated orderId
// ---------------------------------------------------------------------------
async function createOrder({
  productType,
  locationName,
  startDate,
  endDate,
  quantity,
  pickupType,
  dropType,
  pickup,
  drop,
  pickupHotelName,
  dropHotelName,
  pickupTime,
  dropTime,
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
    pickupType,
    dropType,
    pickup,
    drop,
    pickupHotelName,
    dropHotelName,
    pickupTime,
    dropTime,
    customer,
    pricing,
    createdAt: new Date().toISOString(),
  };

  return appendOrder(order);
}

// ---------------------------------------------------------------------------
// Public — log a captured Razorpay payment to the correct Payments sheet.
// productType is read from payment notes and used to route to the right sheet.
// ---------------------------------------------------------------------------
async function logPayment({
  productType,
  orderId,
  razorpayOrderId,
  paymentId,
  amount,
  currency,
  status,
  notes,
  paidAt,
}) {
  const config = SHEET_CONFIG[productType];

  if (!config) {
    console.error(
      `❌ logPayment: no sheet config for productType "${productType}" — payment ${paymentId} not logged`,
    );
    return { success: false, reason: "Unknown productType" };
  }

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
    spreadsheetId: config.spreadsheetId,
    range: config.paymentsSheet,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });

  return { success: true };
}

module.exports = {
  createOrder,
  logPayment,
};

