const postmark = require("postmark");
const EmailLog = require("../models/emailLog.model");

const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);


const sendEmail = async ({
  orderId = null,
  customerId = null,
  to,
  subject,
  html,
  text = "",
  metadata = {},
}) => {
  const log = await EmailLog.create({
    order_id: orderId,

    customer_id: customerId,

    to_email: to,

    from_email: process.env.POSTMARK_FROM_EMAIL,

    subject,

    html_body: html,

    metadata,

    status: "pending",
  });

  try {
    const response = await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL,

      To: to,

      Subject: subject,

      HtmlBody: html,

      TextBody: text,

      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
    });

    log.status = "sent";

    log.message_id = response.MessageID;

    await log.save();

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    log.status = "failed";

    log.error = error.message;

    await log.save();

    console.error("[Postmark]", error);

    return {
      success: false,
      error,
    };
  }
};

const sendTemplateEmail = async ({
  orderId = null,
  customerId = null,

  to,

  templateId,

  templateAlias = null,

  templateModel = {},

  metadata = {},
}) => {
  const log = await EmailLog.create({
    order_id: orderId,

    customer_id: customerId,

    to_email: to,

    from_email: process.env.POSTMARK_FROM_EMAIL,

    template: templateAlias,

    template_id: templateId,

    template_model: templateModel,

    metadata,

    status: "pending",
  });

  try {
    let response;

    if (templateId) {
      response = await client.sendEmailWithTemplate({
        From: process.env.POSTMARK_FROM_EMAIL,
        To: to,
        TemplateId: templateId,
        TemplateModel: templateModel,
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
      });
    } else {
      response = await client.sendEmailWithTemplate({
        From: process.env.POSTMARK_FROM_EMAIL,
        To: to,
        TemplateAlias: templateAlias,
        TemplateModel: templateModel,
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
      });
    }

    log.status = "sent";
    log.message_id = response.MessageID;

    await log.save();

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    log.status = "failed";
    log.error = error.message;

    await log.save();

    console.error("[Postmark]", error);

    return {
      success: false,
      error,
    };
  }
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
};
