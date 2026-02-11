import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail', // Standard for testing. Change for production (e.g., AWS SES, SendGrid)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use an App Password, not your standard password
      },
    });

    const mailOptions = {
      from: `"${data.orgName} Accounts" <${process.env.EMAIL_USER}>`,
      to: data.parentEmail,
      subject: `Fee Challan: ${data.studentName} - ${data.challanNo}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello Parent/Guardian,</h2>
          <p>This is a notification regarding the fee dues for <strong>${data.studentName}</strong>.</p>
          <ul>
            <li><strong>Challan ID:</strong> ${data.challanNo}</li>
            <li><strong>Amount Due:</strong> ${data.currency} ${data.totalAmount}</li>
            <li><strong>Due Date:</strong> ${data.dueDate}</li>
            <li><strong>Status:</strong> ${data.status}</li>
          </ul>
          <p>Please contact ${data.campusName} administration for further details.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
