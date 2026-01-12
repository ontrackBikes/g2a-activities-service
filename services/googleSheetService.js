const { google } = require("googleapis");
const { v4: uuid } = require("uuid");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEETS = {
  GENERATED: "generated_orders",
  PAID: "paid_orders",
};

let sheetsClient;

async function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GS_CLIENT_EMAIL,
      private_key: process.env.GS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function createGeneratedOrder(productType, customer, meta) {
  const sheets = await getClient();

  const orderId = uuid();
  const createdAt = new Date().toISOString();

  const values = [
    [
      orderId,
      productType,
      customer.name,
      customer.phone,
      JSON.stringify(meta),
      createdAt,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEETS.GENERATED}!A:F`,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });

  return { orderId, createdAt };
}

async function createPaidOrder(orderId, payment) {
  const sheets = await getClient();

  const paidAt = new Date().toISOString();

  const values = [
    [orderId, payment.paymentId, payment.amount, payment.mode, paidAt],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEETS.PAID}!A:E`,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });

  return { orderId, paidAt };
}

async function getGeneratedOrders() {
  const sheets = await getClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEETS.GENERATED}!A2:F`,
  });

  return res.data.values || [];
}

async function getPaidOrders() {
  const sheets = await getClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEETS.PAID}!A2:E`,
  });

  return res.data.values || [];
}

module.exports = {
  createGeneratedOrder,
  createPaidOrder,
  getGeneratedOrders,
  getPaidOrders,
};
