// Constraint #6: suppress pdf-parse deprecation warning with version option
const pdfParse = require('pdf-parse')

// Input:  Buffer — raw PDF file bytes
// Output: string — all extracted text from the PDF
async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer, { version: '1.10.100' })
  return data.text
}

module.exports = { extractTextFromPdf }
