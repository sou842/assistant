import type { Metadata } from 'next'

import SharedVaultItemClient from './_components/shared-vault-item-client'

export const metadata: Metadata = {
  title: 'Shared Vault Item',
  description: 'A shared Jarvis vault item.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function SharedVaultItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <SharedVaultItemClient id={id} />
}
