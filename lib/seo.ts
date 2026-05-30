export const SITE_NAME = 'Jarvis'

export const SITE_URL = new URL('https://sou842.github.io')

export const DEFAULT_DESCRIPTION =
  'Jarvis is an intelligent personal assistant for AI scheduling, task automation, integrations, and persistent memory.'

export const OG_IMAGE_URL =
  'https://res.cloudinary.com/dkhh5ugbs/image/upload/v1780138565/fdeiyjbpk7c2ljxazwgd.png'

export const PUBLIC_ROUTES = ['/', '/contact', '/privacy', '/terms'] as const

export function toAbsoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString()
}
