import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PaymentsService } from './payments.service.js';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('holds/:holdId/payment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  createForHold(
    @Param('holdId', ParseIntPipe) holdId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.createForHold(holdId, request.user.id);
  }

  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const event = this.paymentsService.constructWebhookEvent(
      request.rawBody,
      signature,
    );

    const result = await this.paymentsService.handleWebhookEvent(event);

    return {
      received: true,
      type: event.type,
      ...result,
    };
  }
}
