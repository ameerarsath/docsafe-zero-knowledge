/**
 * Debounce utility function
 * Delays the execution of a function until after a specified delay has elapsed
 * since the last time it was invoked.
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Debounce utility for async functions
 * Similar to debounce but handles async functions properly
 * 
 * @param func - The async function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout;
  let currentPromise: Promise<ReturnType<T>> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    clearTimeout(timeoutId);

    if (currentPromise) {
      return currentPromise;
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          currentPromise = func(...args);
          const result = await currentPromise;
          currentPromise = null;
          resolve(result);
        } catch (error) {
          currentPromise = null;
          reject(error);
        }
      }, delay);
    });
  };
}