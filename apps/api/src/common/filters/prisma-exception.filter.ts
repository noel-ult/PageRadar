import { ArgumentsHost, Catch, ExceptionFilter, HttpException, InternalServerErrorException, Logger } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) throw exception;
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') throw new InternalServerErrorException('A record with this value already exists');
    this.logger.error(exception instanceof Error ? exception.stack : String(exception), GqlArgumentsHost.create(host).getInfo()?.fieldName);
    throw new InternalServerErrorException('An unexpected server error occurred');
  }
}
