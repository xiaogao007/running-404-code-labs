import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">Next.js 16.3 lab</p>
      <h1>Choose a product</h1>
      <p>
        Both links share the same dynamic filesystem route. Partial Prefetching
        can reuse one route shell instead of preparing one complete page per URL.
      </p>
      <nav aria-label="Products">
        <Link href="/products/shoes">Running shoes</Link>
        <Link href="/products/hats">Baseball cap</Link>
      </nav>
    </main>
  )
}
