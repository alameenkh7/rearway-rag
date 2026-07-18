import { Injectable } from '@nestjs/common'
import pdfParse from 'pdf-parse'
import { PdfExtractionService } from '../../core/entitygateway/PdfExtractionService'

@Injectable()
export class PdfExtractionServiceImpl implements PdfExtractionService {
  async extractText(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer, { version: 'v1.10.100' })
    return data.text
  }
}
