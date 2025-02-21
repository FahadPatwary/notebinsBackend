import { createHash } from "crypto";
import { promisify } from "util";
import { deflate, inflate } from "zlib";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// Compress content if it's larger than 10KB
const COMPRESSION_THRESHOLD = 10 * 1024; // 10KB

export const hashPassword = (password: string): string => {
  return createHash("sha256").update(password).digest("hex");
};

export const verifyPassword = (
  inputPassword: string,
  hashedPassword: string
): boolean => {
  const hashedInput = hashPassword(inputPassword);
  return hashedInput === hashedPassword;
};

export const compressContent = async (
  content: string
): Promise<{
  compressedContent: string;
  isCompressed: boolean;
}> => {
  if (content.length < COMPRESSION_THRESHOLD) {
    return { compressedContent: content, isCompressed: false };
  }

  try {
    const buffer = Buffer.from(content, "utf-8");
    const compressed = await deflateAsync(buffer);
    const compressedContent = compressed.toString("base64");

    // Only use compression if it actually saves space
    if (compressedContent.length < content.length) {
      return { compressedContent, isCompressed: true };
    }

    return { compressedContent: content, isCompressed: false };
  } catch (error) {
    console.error("Compression error:", error);
    return { compressedContent: content, isCompressed: false };
  }
};

export const decompressContent = async (
  content: string,
  isCompressed: boolean
): Promise<string> => {
  if (!isCompressed) {
    return content;
  }

  try {
    const buffer = Buffer.from(content, "base64");
    const decompressed = await inflateAsync(buffer);
    return decompressed.toString("utf-8");
  } catch (error) {
    console.error("Decompression error:", error);
    return content;
  }
};
