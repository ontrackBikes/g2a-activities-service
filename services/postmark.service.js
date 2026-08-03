const postmark = require("postmark");
const EmailLog = require("../models/emailLog.model");

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN
);

const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL;
const MESSAGE_STREAM =
  process.env.POSTMARK_MESSAGE_STREAM || "outbound";

/**
 * Send normal HTML email
 */
const sendEmail = async ({
  orderId = null,
  customerId = null,

  to,
  cc = null,
  bcc = null,

  subject,

  html,

  text = "",

  metadata = {},
}) => {
  const log = await EmailLog.create({
    order_id: orderId,
    customer_id: customerId,

    to_email: to,
    from_email: FROM_EMAIL,

    subject,
    html_body: html,

    metadata,

    provider: "postmark",

    status: "pending",
  });

  try {
    const response = await client.sendEmail({
      From: FROM_EMAIL,
      To: to,
      Cc: cc || process.env.EMAIL_CC_TEAM, // Use provided CC or default from .env
      Bcc: bcc || process.env.EMAIL_BCC_TEAM, // Use provided BCC or default from .env
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: MESSAGE_STREAM,
    });

    await log.update({
      status: "sent",
      message_id: response.MessageID,
      error: null,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    await log.update({
      status: "failed",
      error: error.message,
    });

    console.error("[Postmark]", error);

    return {
      success: false,
      error,
    };
  }
};

/**
 * Send Postmark template email
 */
const sendTemplateEmail = async ({
  orderId = null,
  customerId = null,

  to,
  cc = null,
  bcc = null,

  templateId = null,
  templateAlias = null,

  templateModel = {},

  metadata = {},
}) => {
  if (!templateId && !templateAlias) {
    throw new Error(
      "Either templateId or templateAlias is required."
    );
  }

  const log = await EmailLog.create({
    order_id: orderId,
    customer_id: customerId,

    to_email: to,
    from_email: FROM_EMAIL,

    template: templateAlias,
    template_id: templateId,
    template_model: templateModel,

    metadata,

    provider: "postmark",

    status: "pending",
  });

  try {
    const payload = {
      From: FROM_EMAIL,
      To: to,
      Cc: cc || process.env.EMAIL_CC_TEAM, // Use provided CC or default from .env
      Bcc: bcc || process.env.EMAIL_BCC_TEAM, // Use provided BCC or default from .env
      TemplateModel: templateModel,
      MessageStream: MESSAGE_STREAM,
    };

    if (templateId) {
      payload.TemplateId = templateId;
    } else {
      payload.TemplateAlias = templateAlias;
    }

    const response =
      await client.sendEmailWithTemplate(payload);

    await log.update({
      status: "sent",
      message_id: response.MessageID,
      error: null,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    await log.update({
      status: "failed",
      error: error.message,
    });

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