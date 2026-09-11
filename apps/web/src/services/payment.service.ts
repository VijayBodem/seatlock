import { apiRequest } from './api'
import type { PaymentSession } from '../types/showtime'

export function createPaymentForHold(holdId: number, accessToken: string): Promise<PaymentSession> {
  return apiRequest<PaymentSession>(`/holds/${holdId}/payment`, {
    method: 'POST',
    accessToken,
  })
}
