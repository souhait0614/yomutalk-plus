export const computeContentHash = async (content: ArrayBuffer): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', content));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
