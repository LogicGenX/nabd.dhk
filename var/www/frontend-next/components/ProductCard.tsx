import Image from 'next/image'
import Link from 'next/link'

export interface Product {
  id: string
  title: string
  thumbnail: string
  price: number
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group block bg-white border border-gray-200"
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={product.thumbnail}
          alt={product.title}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="bg-white text-black px-4 py-2 text-sm">
            Quick View
          </button>
        </div>
      </div>
      <div className="p-2 text-sm">
        <h3 className="font-bold text-black">{product.title}</h3>
        <p className="font-bold text-black">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  )
}
