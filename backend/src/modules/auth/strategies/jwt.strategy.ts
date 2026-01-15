import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { env } from '@/config';
import { AUTH_CONSTANTS } from '@/config/constants';

export const AUTH_COOKIE_NAME = AUTH_CONSTANTS.COOKIE_NAME;

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADVISOR' | 'CLIENT' | 'ADMIN';
}

export interface RequestUser {
  id: string;
  email: string;
  role: 'ADVISOR' | 'CLIENT' | 'ADMIN';
}

export function extractJwtFromCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  if (cookies && AUTH_COOKIE_NAME in cookies) {
    return cookies[AUTH_COOKIE_NAME];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
