require("dotenv").config();

const postmark = require("postmark");

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN
);

(async () => {
  try {
    console.log("Server Token:", process.env.POSTMARK_SERVER_TOKEN);
    console.log("From:", process.env.POSTMARK_FROM_EMAIL);
    console.log("Stream:", process.env.POSTMARK_MESSAGE_STREAM);

    const response = await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: process.argv[2], // recipient passed via CLI
      Subject: "Postmark Test",
      HtmlBody: "<h1>Postmark is working ✅</h1>",
      TextBody: "Postmark is working",
      MessageStream:
        process.env.POSTMARK_MESSAGE_STREAM || "outbound",
    });

    console.log("SUCCESS");
    console.log(response);
  } catch (err) {
    console.error("FAILED");
    console.error("Status:", err.statusCode);
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    console.error(err);
  }
})();