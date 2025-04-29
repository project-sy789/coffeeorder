import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Order, OrderWithItems } from "@shared/schema";

export function useOrders() {
  // Get all orders
  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });
  
  // Get a specific order with items
  const getOrder = (id: number) => {
    return useQuery<OrderWithItems>({
      queryKey: [`/api/orders/${id}`],
      enabled: !!id,
    });
  };
  
  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest('PUT', `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
  });
  
  return {
    orders,
    loadingOrders,
    getOrder,
    updateOrderStatus,
  };
}
