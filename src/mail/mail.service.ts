import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_APP_PASSWORD, 
      },
    });
  }

  async sendMail(options: { to: string; subject: string; html: string }) {
    await this.transporter.sendMail({
      from: `"Accurack" <no-reply@accurack.ai>`, // Your custom "From"
      replyTo: 'do-not-reply@accurack.ai', 
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}