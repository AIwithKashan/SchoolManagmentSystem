export interface ValidationResult {
  isValid: boolean;
  error?: string;
  newName?: string;
}

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  // 1. Check size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: "File exceeds maximum size of 10MB" };
  }

  // 2. Check extension
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // 3. Check mime-type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { isValid: false, error: "Invalid file type." };
  }

  // 4. Safe UUID generation
  const uuid = crypto.randomUUID();
  const newName = `${uuid}.${extension}`;

  return {
    isValid: true,
    newName,
  };
}
