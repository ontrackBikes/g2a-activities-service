const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid"); // To generate orderId
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// Spreadsheet ID
const SPREADSHEET_ID = "11s9MSAsEiAzsCNtNzEu6Z-mSi1pX1Sf5KMoxsveQ0qs";
const SHEET_NAME = "Orders"; // Sheet where orders will be logged

async function appendOrder(order) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const now = new Date().toISOString();

  const row = [
    order.orderId,
    order.productType,
    order.locationName,
    order.startDate,
    order.endDate,
    order.quantity,
    order.pricing.label,
    order.pricing.perDay,
    order.pricing.total,
    order.pickup,
    order.drop,
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
  pickup = true,
  drop = true,
  customer,
  pricing, // { label, perDay, total } calculated in productService
}) {
  const orderId = `ORD-${uuidv4().split("-")[0]}`; // simple internal orderId

  const order = {
    orderId,
    productType,
    locationName,
    startDate,
    endDate,
    quantity,
    pickup,
    drop,
    customer,
    pricing,
    createdAt: new Date().toISOString(),
  };

  return appendOrder(order);
}

module.exports = {
  createOrder,
};
