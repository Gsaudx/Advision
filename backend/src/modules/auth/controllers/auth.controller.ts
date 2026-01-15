import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response as ExpressResponse } from 'express';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { env, parseJwtExpirationToMs } from '@/config';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, UserProfileApiResponseDto } from '../schemas';
import type { UserProfile } from '../schemas';
import { AUTH_COOKIE_NAME, type RequestUser } from '../strategies/jwt.strategy';
import { LocalAuthGuard } from '../guards/local-auth.guard';

interface RequestWithUser extends Request {
  user: RequestUser;
}

interface RequestWithProfile extends Request {
  user: UserProfile;
}

function setAuthCookie(res: ExpressResponse, token: string): void {
  const maxAge = parseJwtExpirationToMs(env.JWT_EXPIRES_IN);

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !!env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
    domain: env.COOKIE_DOMAIN ? String(env.COOKIE_DOMAIN) : undefined,
  });
}

function clearAuthCookie(res: ExpressResponse): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: !!env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    domain: env.COOKIE_DOMAIN ? String(env.COOKIE_DOMAIN) : undefined,
  });
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar novo usuario',
    description:
      'Cria uma nova conta na plataforma. Define um cookie HttpOnly com o token JWT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assessor registrado com sucesso',
    type: UserProfileApiResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email ja cadastrado',
    type: ApiErrorResponseDto,
  })
  async register(
    @Body() body: RegisterDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<ApiResponseType<UserProfile>> {
    const data = await this.authService.register(body);
    setAuthCookie(res, data.accessToken);
    return ApiResponseDto.success(data.user, 'Registro realizado com sucesso');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Autenticar usuario',
    description:
      'Autentica o usuario e define um cookie HttpOnly com o token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: UserProfileApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais invalidas',
    type: ApiErrorResponseDto,
  })
  login(
    @Body() _body: LoginDto,
    @Request() req: RequestWithProfile,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): ApiResponseType<UserProfile> {
    const token = this.authService.generateToken(req.user);
    setAuthCookie(res, token);
    return ApiResponseDto.success(req.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Encerrar sessao',
    description: 'Remove o cookie de autenticacao.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
  })
  logout(
    @Response({ passthrough: true }) res: ExpressResponse,
  ): ApiResponseType<null> {
    clearAuthCookie(res);
    return ApiResponseDto.success(null, 'Logout realizado com sucesso');
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obter perfil do usuario',
    description: 'Retorna os dados do usuario autenticado via cookie.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil retornado com sucesso',
    type: UserProfileApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Cookie invalido ou expirado',
    type: ApiErrorResponseDto,
  })
  async getProfile(
    @Request() req: RequestWithUser,
  ): Promise<ApiResponseType<UserProfile>> {
    const data = await this.authService.getProfile(req.user.id);
    return ApiResponseDto.success(data);
  }
}
