import PDFDocument from "pdfkit";
import { Injectable, Logger } from "@nestjs/common";
import { createWriteStream, existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { sha256File } from "../utils/crypto";

export interface GeneratedPdf {
  /** Public storage path, e.g. /storage/receipts/receipt-RCP-1.pdf */
  url: string;
  /** SHA-256 hex checksum of the generated file — for integrity verification */
  checksum: string;
  /** File size in bytes */
  fileSize: number;
}

export interface AgreementPdfData {
  agreementNumber: string;
  bookingNumber: string;
  buyerName: string;
  buyerPhone: string;
  projectName: string;
  unitNumber: string;
  unitType: string;
  totalAmount: number;
  bookingAmount: number;
  bookingDate: string;
  companyName: string;
  /** Optional merged template body (already substituted placeholders). */
  bodyText?: string;
  title?: string;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  bookingNumber: string;
  buyerName: string;
  amount: number;
  paymentMode: string;
  reference?: string;
  date: string;
  installmentName: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly storageDir = join(process.cwd(), "storage");

  constructor() {
    for (const dir of ["agreements", "receipts"]) {
      const path = join(this.storageDir, dir);
      if (!existsSync(path)) mkdirSync(path, { recursive: true });
    }
  }

  private async finalize(filepath: string, url: string): Promise<GeneratedPdf> {
    const checksum = await sha256File(filepath);
    const fileSize = statSync(filepath).size;
    return { url, checksum, fileSize };
  }

  async generateAgreement(data: AgreementPdfData): Promise<GeneratedPdf> {
    const filename = `agreement-${data.agreementNumber}.pdf`;
    const filepath = join(this.storageDir, "agreements", filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filepath);
      doc.pipe(stream);

      const title = data.title ?? "ALLOTMENT AGREEMENT";
      doc.fontSize(20).text(title, { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Agreement No: ${data.agreementNumber}`, { align: "right" });
      doc.text(`Booking No: ${data.bookingNumber}`, { align: "right" });
      doc.text(`Date: ${data.bookingDate}`, { align: "right" });
      doc.moveDown();

      if (data.bodyText?.trim()) {
        doc.fontSize(11).text(data.bodyText, { align: "justify", lineGap: 4 });
        doc.moveDown(2);
      } else {
        doc.fontSize(12).text(`This Agreement is entered into between:`);
        doc.moveDown(0.5);
        doc.fontSize(11).text(`Developer: ${data.companyName}`);
        doc.text(`Buyer: ${data.buyerName}`);
        doc.text(`Phone: ${data.buyerPhone}`);
        doc.moveDown();

        doc.text("PROPERTY DETAILS", { underline: true });
        doc.moveDown(0.5);
        doc.text(`Project: ${data.projectName}`);
        doc.text(`Unit: ${data.unitNumber} (${data.unitType})`);
        doc.moveDown();

        doc.text("FINANCIAL TERMS", { underline: true });
        doc.moveDown(0.5);
        doc.text(`Total Sale Consideration: ₹${data.totalAmount.toLocaleString("en-IN")}`);
        doc.text(`Booking Amount Received: ₹${data.bookingAmount.toLocaleString("en-IN")}`);
        doc.moveDown();

        doc.fontSize(10).text(
          "This allotment letter is subject to the terms and conditions of the Builder-Buyer Agreement " +
            "to be executed subsequently. The buyer agrees to make payments as per the payment schedule.",
          { align: "justify" },
        );
        doc.moveDown(2);
      }

      doc.text("_______________________          _______________________");
      doc.text("Authorized Signatory              Buyer Signature");

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    this.logger.log(`Agreement PDF generated: ${filename}`);
    return this.finalize(filepath, `/storage/agreements/${filename}`);
  }

  async generateReceipt(data: ReceiptPdfData): Promise<GeneratedPdf> {
    const filename = `receipt-${data.receiptNumber}.pdf`;
    const filepath = join(this.storageDir, "receipts", filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A5" });
      const stream = createWriteStream(filepath);
      doc.pipe(stream);

      doc.fontSize(18).text("PAYMENT RECEIPT", { align: "center" });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Receipt No: ${data.receiptNumber}`, { align: "right" });
      doc.text(`Date: ${data.date}`, { align: "right" });
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Received from: ${data.buyerName}`);
      doc.text(`Booking: ${data.bookingNumber}`);
      doc.text(`Towards: ${data.installmentName}`);
      doc.moveDown();

      doc.fontSize(16).text(`Amount: ₹${data.amount.toLocaleString("en-IN")}`, { align: "center" });
      doc.moveDown();

      doc.fontSize(10);
      doc.text(`Payment Mode: ${data.paymentMode}`);
      if (data.reference) doc.text(`Reference: ${data.reference}`);
      doc.moveDown(2);
      doc.text("This is a computer-generated receipt.", { align: "center" });

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    this.logger.log(`Receipt PDF generated: ${filename}`);
    return this.finalize(filepath, `/storage/receipts/${filename}`);
  }
}
