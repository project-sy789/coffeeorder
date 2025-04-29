import { Input } from "@/components/ui/input";
import { Search, FilterX } from "lucide-react";
import { useState, useEffect } from "react";

interface MenuSearchProps {
  onSearch: (query: string) => void;
}

export function MenuSearch({ onSearch }: MenuSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, onSearch]);
  
  return (
    <div className="relative md:w-80 lg:w-96 xl:w-[450px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <Input
        placeholder="ค้นหาเมนู..."
        className="pl-10 w-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button 
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <FilterX size={16} />
        </button>
      )}
    </div>
  );
}