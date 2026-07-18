export interface PdfExtractionService {
  extractText(buffer: Buffer): Promise<string>
}
