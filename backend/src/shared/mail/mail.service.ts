import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '@/config';

/**
 * Serviço de envio de e-mails.
 *
 * Usa SMTP (nodemailer) quando as variáveis SMTP_* estão configuradas.
 * Caso contrário, opera em "modo dev": apenas registra no log o conteúdo do e-mail
 * (incluindo links), permitindo testar os fluxos localmente sem provedor externo.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
      this.logger.log(`SMTP configurado (${env.SMTP_HOST}:${env.SMTP_PORT})`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP não configurado — e-mails serão apenas registrados no log (modo dev).',
      );
    }
  }

  /**
   * Envia um e-mail. Em modo dev (sem SMTP), apenas loga o conteúdo.
   */
  async send(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[DEV MAIL] Para: ${options.to} | Assunto: ${options.subject}\n${options.text ?? options.html}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail para ${options.to}`, error);
      throw error;
    }
  }

  /**
   * E-mail de recuperação de senha com o link contendo o token.
   */
  async sendPasswordReset(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const subject = 'Recuperação de senha — Advision';
    const text = `Olá, ${name}.\n\nRecebemos um pedido para redefinir sua senha. Acesse o link abaixo para criar uma nova senha (válido por 1 hora):\n\n${resetUrl}\n\nSe você não solicitou, ignore este e-mail.`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #2563eb;">Recuperação de senha</h2>
        <p>Olá, <strong>${name}</strong>.</p>
        <p>Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir senha</a>
        </p>
        <p style="font-size: 12px; color: #64748b;">Se o botão não funcionar, copie e cole este endereço no navegador:<br />${resetUrl}</p>
        <p style="font-size: 12px; color: #64748b;">Se você não solicitou esta alteração, ignore este e-mail com segurança.</p>
      </div>
    `;
    await this.send({ to, subject, html, text });
  }
}
