import { AddressElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type StripeCheckoutProps = {
  isHoldActive: boolean
  onPaymentConfirmed: () => Promise<void>
}

export function StripeCheckout({ isHoldActive, onPaymentConfirmed }: StripeCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { t } = useTranslation()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!stripe || !elements || !isHoldActive || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const submitResult = await elements.submit()

      if (submitResult.error) {
        setErrorMessage(submitResult.error.message ?? t('showtimeSeats.payment.requiredDetails'))
        return
      }

      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (result.error) {
        setErrorMessage(result.error.message ?? t('showtimeSeats.payment.failed'))
        return
      }

      if (
        result.paymentIntent?.status !== 'succeeded' &&
        result.paymentIntent?.status !== 'processing'
      ) {
        setErrorMessage(t('showtimeSeats.payment.incomplete'))
        return
      }

      await onPaymentConfirmed()
    } catch {
      setErrorMessage(t('showtimeSeats.payment.unexpectedError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {t('showtimeSeats.payment.billingDetails')}
        </h3>

        <AddressElement
          options={{
            mode: 'billing',
            allowedCountries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SG', 'AE'],
          }}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {t('showtimeSeats.payment.paymentDetails')}
        </h3>

        <PaymentElement
          options={{
            fields: {
              billingDetails: {
                address: 'never',
              },
            },
          }}
        />
      </div>

      {errorMessage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <button
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        disabled={!stripe || !elements || !isHoldActive || isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? t('showtimeSeats.payment.processing')
          : t('showtimeSeats.payment.paySecurely')}
      </button>
    </form>
  )
}
