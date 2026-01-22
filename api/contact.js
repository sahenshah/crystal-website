import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const { name, email, message } = req.body;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "crystal.industries.website@gmail.com",
      pass: "zhurkjembtwfcfig",
    },
  });
  await transporter.sendMail({
    from: '"Crystal Website Contact" <crystal.industries.website@gmail.com>',
    to: "sahenshah95@gmail.com",
    replyTo: email,
    subject: `Contact Form: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
  res.json({ success: true });
}