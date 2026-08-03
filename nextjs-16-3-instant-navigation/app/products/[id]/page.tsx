import Link from 'next/link'
import { Suspense } from 'react'

export const instant = true

type ProductPageProps = {
  params: Promise<{ id: string }>
}

const products: Record<string, { name: string; inventory: string }> = {
  shoes: { name: 'Running shoes', inventory: '18 pairs in stock' },
  hats: { name: 'Baseball cap', inventory: '12 caps in stock' },
}

async function ProductDetails({ params }: ProductPageProps) {
  const { id } = await params
  await new Promise((resolve) => setTimeout(resolve, 700))

  const product = products[id] ?? {
    name: 'Unknown product',
    inventory: 'Inventory unavailable',
  }

  return (
    <section aria-live="polite">
      <h2>{product.name}</h2>
      <p>{product.inventory}</p>
    </section>
  )
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <main>
      <p className="eyebrow">Reusable route shell</p>
      <h1>Product details</h1>
      <Link href="/">Back to products</Link>
      <Suspense fallback={<p>Checking inventory...</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </main>
  )
}
