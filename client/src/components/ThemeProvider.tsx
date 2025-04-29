import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ThemeData {
  variant: string;
  primary: string;
  appearance: string;
  radius: number;
}

export default function ThemeProvider() {
  // Fetch theme data
  const { data: themeData } = useQuery<ThemeData>({
    queryKey: ['/api/theme'],
    queryFn: async () => {
      const { data } = await apiRequest('GET', '/api/theme');
      return data;
    },
    refetchInterval: 5000, // Check for theme updates every 5 seconds
  });

  // Apply theme when data changes
  useEffect(() => {
    if (themeData && themeData.primary) {
      // Update the CSS variable for primary color
      document.documentElement.style.setProperty('--primary', extractHSLValues(themeData.primary));
      
      // Update coffee-primary as well (used in many places)
      const color = themeData.primary; // e.g. "hsl(142, 71%, 45%)"
      document.documentElement.style.setProperty('--coffee-primary', color);
      
      // Update ring color to match primary
      document.documentElement.style.setProperty('--ring', extractHSLValues(themeData.primary));
      
      console.log('Theme updated:', themeData.primary);
    }
  }, [themeData]);

  return null; // This is a utility component, no UI needed
}

// Helper function to extract HSL values from an HSL string
function extractHSLValues(hslString: string): string {
  // Remove "hsl(" and ")" from the string to get just the values
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // If no match found, return as is (already in the right format)
  if (hslString.includes(',')) {
    return hslString;
  }
  
  // Default fallback
  return '30 35% 33%';
}