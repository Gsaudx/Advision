import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MailService } from '@/shared/mail';
import { env } from '@/config';
import { AUTH_CONSTANTS } from '@/config/constants';
import type { RegisterInput } from '../schemas';
import type { UserProfile, AuthToken } from '../schemas';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { clientProfile: true },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return this.toUserProfile(user);
  }

  generateToken(user: UserProfile): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  login(user: UserProfile): AuthToken {
    return {
      accessToken: this.generateToken(user),
      user,
    };
  }

  async register(data: RegisterInput): Promise<AuthToken> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role ?? 'ADVISOR',
        cpfCnpj: data.cpfCnpj ?? null,
        phone: data.phone ?? null,
      },
      include: { clientProfile: true },
    });

    const userProfile = this.toUserProfile(user);
    return this.login(userProfile);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return this.toUserProfile(user);
  }

  /**
   * Inicia o fluxo de recuperação de senha.
   * Resposta sempre genérica (não revela se o e-mail existe) para evitar enumeração de contas.
   * Quando o usuário existe, gera um token de uso único (armazenado apenas como hash) e envia o link por e-mail.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return; // resposta genérica — não revela ausência da conta
    }

    // Invalida tokens anteriores ainda não utilizados deste usuário
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(
      AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_BYTES,
    ).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000,
    );

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = env.APP_URL ?? env.CORS_ORIGIN;
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordReset(user.email, user.name, resetUrl);
  }

  /**
   * Conclui a recuperação: valida o token (hash, não expirado, não usado),
   * atualiza a senha e marca o token como utilizado.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    name: string;
    role: 'ADVISOR' | 'CLIENT' | 'ADMIN';
    cpfCnpj: string | null;
    phone: string | null;
    clientProfile?: { id: string } | null;
    createdAt: Date;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cpfCnpj: user.cpfCnpj,
      phone: user.phone,
      clientProfileId: user.clientProfile?.id ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
