import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'; import { JwtService } from '@nestjs/jwt'; import * as bcrypt from 'bcryptjs'; import { PrismaService } from '../prisma/prisma.service'; import { LoginInput, RegisterInput } from './dto/auth.input';
@Injectable() export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  async register(input: RegisterInput) { const email = input.email.toLowerCase(); if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists'); const passwordHash = await bcrypt.hash(input.password, 12); const user = await this.prisma.user.create({ data: { name: input.name.trim(), email, passwordHash } }); return this.payload(user); }
  async login(input: LoginInput) { const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } }); if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password'); return this.payload(user); }
  private payload(user: { id: string; email: string; name: string; createdAt: Date }) { return { accessToken: this.jwt.sign({ sub: user.id, email: user.email }), user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } }; }
}
