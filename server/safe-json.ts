import { Response } from 'express';

/**
 * Utility function to safely convert data to JSON string
 * with fallback for potentially problematic structures
 */
export function safeJSONStringify(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error("JSON serialization error in safeJSONStringify:", error);
    
    if (Array.isArray(data)) {
      return "[]";
    } else if (data === null || data === undefined) {
      return "null";
    } else {
      return JSON.stringify({ error: "Error serializing response" });
    }
  }
}

/**
 * Send data as JSON with special handling for problematic cases
 * This bypasses the normal res.json() mechanism for endpoints
 * that are causing issues
 */
export function safeSendJSON(res: Response, data: any): void {
  try {
    // Test serialization
    const serialized = JSON.stringify(data);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    
    // Send raw stringified data
    res.send(serialized);
  } catch (error) {
    console.error("JSON serialization error in safeSendJSON:", error);
    
    // Fallback to empty response based on data type
    res.setHeader('Content-Type', 'application/json');
    
    if (Array.isArray(data)) {
      res.send("[]");
    } else if (data === null || data === undefined) {
      res.send("null");
    } else {
      res.send(JSON.stringify({ error: "Error serializing response" }));
    }
  }
}