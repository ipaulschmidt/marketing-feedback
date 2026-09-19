export type FilePayload = { fileName: string; mimeType: string; base64: string };

export async function fileToPayload(file: File): Promise<FilePayload> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { fileName: file.name, mimeType: file.type, base64: btoa(binary) };
}

export async function filesToPayloads(files: File[]): Promise<FilePayload[]> {
  return Promise.all(files.map(fileToPayload));
}
