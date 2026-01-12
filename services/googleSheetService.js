const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid"); // To generate orderId
const credentials = require("../data/google-service-account.json"); // your service account

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// Spreadsheet ID
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
const SHEET_NAME = "orders"; // Sheet where orders will be logged

async function appendOrder(order) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const row = [
    order.orderId,
    order.productType,
    order.locationName,
    order.startDate,
    order.endDate,
    order.quantity,
    order.pricingLabel,
    order.totalPrice,
    order.pickup,
    order.drop,
    order.createdAt,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [row],
    },
  });

  return { success: true, orderId: order.orderId };
}

async function createOrder({
  productType,
  locationName,
  startDate,
  endDate,
  quantity,
  pricingLabel,
  totalPrice,
  pickup = true,
  drop = true,
}) {
  const orderId = `ORD-${uuidv4().split("-")[0]}`; // simple internal orderId
  const createdAt = new Date().toISOString();

  const order = {
    orderId,
    productType,
    locationName,
    startDate,
    endDate,
    quantity,
    pricingLabel,
    totalPrice,
    pickup,
    drop,
    createdAt,
  };

  return appendOrder(order);
}

module.exports = {
  createOrder,
};
