import { createStart, createMiddleware } from "@tanstack/react-start";

// Global request middleware: log unexpected server errors, then let TanStack
// Start's own error handling (errorComponent / notFound) render the response.
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Re-throw framework redirects / typed HTTP errors untouched.
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    throw error;
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
