import { Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuPanelProps {
  activeCategory: string;
  categories: string[];
  products: Product[];
  isLoading: boolean;
  onCategoryChange: (category: string) => void;
  onProductSelect: (product: Product) => void;
}

export default function MenuPanel({
  activeCategory,
  categories,
  products,
  isLoading,
  onCategoryChange,
  onProductSelect
}: MenuPanelProps) {
  return (
    <div className="w-2/3 flex flex-col h-full">
      {/* Menu Categories */}
      <div className="bg-white py-2 px-4 flex space-x-2 overflow-x-auto shadow">
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 whitespace-nowrap text-lg ${
              activeCategory === category
                ? "border-b-3 border-[var(--coffee-primary)] text-[var(--coffee-primary)] font-medium"
                : "text-gray-600"
            }`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Menu Grid */}
      <div className="p-4 flex-1 overflow-y-auto grid grid-cols-3 gap-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <Skeleton className="w-full h-40" />
              <div className="p-3">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <div className="flex justify-between items-center mt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : (
          // Actual product cards
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onProductSelect(product)}
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-40 object-cover"
              />
              <div className="p-3">
                <h3 className="font-medium text-lg">{product.name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[var(--coffee-primary)] font-medium">฿{product.price}</span>
                  <button
                    className="bg-[var(--coffee-primary)] text-white px-3 py-1 rounded-full text-sm hover:bg-opacity-90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProductSelect(product);
                    }}
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
