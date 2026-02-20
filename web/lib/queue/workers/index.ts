import { startEmailWorker } from "./email.worker";
import { startOtpWorker } from "./otp.worker";
import { startSmsWorker } from "./sms.worker";
import { startWhatsAppWorker } from "./whatsapp.worker";
import { startNotificationWorker } from "./notification.worker";
import { startChallanPdfWorker } from "./challan-pdf.worker";
import { startReportWorker } from "./report.worker";
import { startBulkSmsWorker } from "./bulk-sms.worker";
import { startImportWorker } from "./import.worker";

let started = false;

/**
 * Starts all background workers. Safe to call multiple times —
 * only bootstraps once per process.
 */
export function startWorkers(): void {
  if (started) return;
  started = true;

  console.log("[Workers] Bootstrapping background job workers…");
  startEmailWorker();
  startOtpWorker();
  startSmsWorker();
  startWhatsAppWorker();
  startNotificationWorker();
  startChallanPdfWorker();
  startReportWorker();
  startBulkSmsWorker();
  startImportWorker();
  console.log("[Workers] All workers started.");
}
