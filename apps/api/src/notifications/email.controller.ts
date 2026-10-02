import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { EmailService } from "./email.service";

@Controller("email")
export class EmailController {
  constructor(private readonly email: EmailService) {}
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    if (!request.rawBody || request.rawBody.length > 65536)
      throw new BadRequestException("Invalid webhook body.");
    await this.email.receiveWebhook(request.rawBody, headers);
    return { ok: true };
  }
  @Post("unsubscribe")
  @HttpCode(200)
  async unsubscribe(
    @Query("token") token: string,
    @Body() body: Record<string, string>,
  ) {
    if (body?.["List-Unsubscribe"] !== "One-Click")
      throw new BadRequestException("Invalid unsubscribe request.");
    await this.email.unsubscribe(token);
    return { ok: true };
  }
}
