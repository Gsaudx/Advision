import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/prisma/prisma.service';

export class ClientsCrudService {
    constructor(private readonly prisma: PrismaService) { }
}