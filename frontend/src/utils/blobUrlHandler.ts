/**
 * Blob URL Handler Utility
 *
 * Provides robust blob URL handling with automatic fallbacks
 * to avoid Chrome security restrictions on blob URLs
 */

export interface BlobUrlResult {
  url: string;
  method: 'blob' | 'data-url' | 'proxy' | 'direct';
  cleanup?: () => void;
}

/**
 * Creates a blob URL with automatic fallback strategies
 */
export function createBlobUrlWithFallback(
  data: Blob | Uint8Array | ArrayBuffer,
  mimeType: string,
  fileName?: string
): BlobUrlResult {
  // Convert data to Blob if needed
  const blob = data instanceof Blob
    ? data
    : new Blob([data], { type: mimeType });

  // Strategy 1: Try creating a blob URL
  try {
    const blobUrl = URL.createObjectURL(blob);

    return {
      url: blobUrl,
      method: 'blob',
      cleanup: () => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      }
    };
  } catch (e) {
    console.warn('Blob URL creation failed, falling back to data URL:', e);
  }

  // Strategy 2: Fall back to data URL
  try {
    return new Promise<BlobUrlResult>((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          url: dataUrl,
          method: 'data-url'
        });
      };

      reader.onerror = () => {
        console.warn('Data URL creation failed, using direct method');
        resolve({
          url: '',
          method: 'direct'
        });
      };

      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Data URL creation failed:', e);
  }

  // Strategy 3: Direct method (empty URL, caller should handle)
  return {
    url: '',
    method: 'direct'
  };
}

/**
 * Checks if the browser is Chrome (to handle blob URL restrictions)
 */
export function isChromeBrowser(): boolean {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

/**
 * Determines if blob URLs are likely to be blocked
 */
export function isBlobUrlLikelyBlocked(url: string): boolean {
  // Chrome blocks blob URLs in iframes for certain content types
  return isChromeBrowser() && (
    url.startsWith('blob:') &&
    (url.includes('pdf') || url.includes('csv'))
  );
}

/**
 * Creates a safe download URL with multiple fallback options
 */
export async function createSafeDownloadUrl(
  data: Blob | Uint8Array | ArrayBuffer,
  mimeType: string,
  fileName: string,
  baseUrl?: string
): Promise<string> {
  // For Chrome + PDF/CSV, prefer proxy or direct download
  if (isChromeBrowser() && (mimeType === 'application/pdf' || mimeType === 'text/csv')) {
    if (baseUrl) {
      // Return a proxy URL that can handle the download
      const params = new URLSearchParams({
        filename: fileName,
        type: mimeType
      });
      return `${baseUrl}/api/v1/documents/download-proxy?${params.toString()}`;
    }
  }

  // Try blob URL first
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

    return blobUrl;
  } catch (e) {
    console.warn('Blob download failed, trying data URL:', e);
  }

  // Fall back to data URL
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const dataUrl = reader.result as string;

        // Create link for data URL
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        resolve(dataUrl);
      };

      reader.onerror = () => reject(new Error('Failed to create data URL'));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('All download methods failed:', e);
    throw new Error('Unable to create download link');
  }
}

/**
 * Cleans up blob URLs to prevent memory leaks
 */
export function cleanupBlobUrls(urls: string[]): void {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Failed to cleanup blob URL:', url, e);
      }
    }
  });
}