import nodemailer from "nodemailer";
import axios from "axios";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// 1. EMAIL CONFIG
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.titan.email",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2. SMS CONFIG (Veevo Tech Pakistan)
const sendSMS = async (number: string, message: string) => {
  const url = `https://api.veevotech.com/sendsms?hash=${process.env.VEEVO_HASH}&receivenum=${number}&sendernum=${process.env.VEEVO_SENDER}&textmessage=${encodeURIComponent(message)}`;
  return axios.get(url);
};

type ChannelStatus = {
  sent: boolean;
  error?: string;
};

export type NotificationResult = {
  email: ChannelStatus;
  sms: ChannelStatus;
  whatsapp: ChannelStatus;
};

export const notifyParent = async (
  student: any,
  challan: any,
  type: "GENERATED" | "REMINDER" | "PAID",
): Promise<NotificationResult> => {
  const message = {
    GENERATED: `Dear Parent, Challan ${challan.challanNo} for ${student.fullName} has been generated. Amount: ${challan.totalAmount}. Due: ${challan.dueDate}.`,
    REMINDER: `REMINDER: Fee for ${student.fullName} is due in 3 days. Please pay ${challan.totalAmount} by ${challan.dueDate} to avoid late fine.`,
    PAID: `Payment Received! Thank you for paying ${challan.totalAmount} for ${student.fullName}. Your receipt is available online.`,
  }[type];

  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
    whatsapp: { sent: false },
  };

  // Send Email (best effort)
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "SAIREX SMS"}" <${process.env.SMTP_USER}>`,
      to: student.parentEmail, // Ensure this exists in your Student model
      subject: `Fee Notification - ${type}`,
      text: message,
    });
    result.email.sent = true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown email error";
    result.email.error = errMsg;
    console.warn("Email notification failed:", errMsg);
  }

  // Send SMS (best effort)
  try {
    await sendSMS(student.parentPhone, message);
    result.sms.sent = true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown SMS error";
    result.sms.error = errMsg;
    console.warn("SMS notification failed:", errMsg);
  }

  // Send WhatsApp (best effort)
  try {
    await sendWhatsAppMessage(student.parentPhone, message);
    result.whatsapp.sent = true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown WhatsApp error";
    result.whatsapp.error = errMsg;
    console.warn("WhatsApp notification failed:", errMsg);
  }

  return result;
};
