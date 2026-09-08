const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error('VITE_API_URL is not configured')
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiErrorBody = {
  message?: string | string[]
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string
}

function getErrorMessage(body: unknown, status: number): string {
  if (typeof body !== 'object' || body === null) {
    return `Request failed with status ${status}`
  }

  const { message } = body as ApiErrorBody

  if (Array.isArray(message)) {
    return message.join(', ')
  }

  if (typeof message === 'string') {
    return message
  }

  return `Request failed with status ${status}`
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  return text || undefined
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { accessToken, ...requestOptions } = options

  const headers = new Headers(requestOptions.headers)

  headers.set('Accept', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...requestOptions,
    headers,
  })

  const body = await parseResponse(response)

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(body, response.status))
  }

  return body as T
}