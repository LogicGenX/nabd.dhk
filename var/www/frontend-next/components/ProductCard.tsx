import Image from 'next/image'
import Link from 'next/link'
import { formatAmount } from '../lib/currency'
import { type ProductSummary } from '../lib/products'

export type Product = ProductSummary

interface ProductCardProps {
  product: ProductSummary
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group block bg-white border border-gray-200 rounded-md shadow-sm"
    >
      <div className="relative overflow-hidden rounded-t-md aspect-[4/5]">
        <Image
          src={product.thumbnail}
          alt={product.title}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="bg-accent text-white px-4 py-2 text-sm rounded-md hover:bg-accent/90">
            Quick View
          </button>
        </div>
      </div>
      <div className="p-2 text-sm">
        <h3 className="font-bold text-black">{product.title}</h3>
        <p className="font-bold text-black">{formatAmount(product.price)}</p>
      </div>
    </Link>
  )
}
