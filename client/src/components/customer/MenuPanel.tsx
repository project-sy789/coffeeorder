import { Product } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuSearch } from "./MenuSearch";

interface MenuPanelProps {
  activeCategory: string;
  categories: string[];
  products: Product[];
  isLoading: boolean;
  onCategoryChange: (category: string) => void;
  onProductSelect: (product: Product) => void;
  onSearch?: (query: string) => void;
}

export default function MenuPanel({
  activeCategory,
  categories,
  products,
  isLoading,
  onCategoryChange,
  onProductSelect,
  onSearch,
}: MenuPanelProps) {
  if (isLoading) {
    return (
      <div>
        <div className="flex overflow-x-auto pb-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full mx-1" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="menu-card overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Categories Navigation */}
      <div className="mb-6">
        <div className="flex overflow-x-auto pb-3 mb-4 hide-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`category-pill mx-1 whitespace-nowrap ${
                activeCategory === category ? "active" : ""
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="menu-card"
                onClick={() => onProductSelect(product)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.image || "https://via.placeholder.com/300x200?text=Coffee"}
                    alt={product.name}
                    className="menu-image w-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/300x200?text=Coffee";
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[var(--coffee-primary)] text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {product.description || 'เครื่องดื่มรสชาติดีเยี่ยม'}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="font-semibold text-lg">{formatCurrency(product.price)}</p>
                    <div className="text-xs px-2 py-1 bg-[var(--coffee-light)] text-[var(--coffee-primary)] rounded-full">
                      {product.category}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-lg shadow p-4">
              ไม่พบสินค้าในหมวดหมู่นี้
            </div>
          )}
        </div>
      </div>
    </div>
  );
}