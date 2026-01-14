import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { RegisterInput } from '../schemas';
import type { UserProfile, AuthToken } from '../schemas';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
