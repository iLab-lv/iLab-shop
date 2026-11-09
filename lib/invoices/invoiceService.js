import 'server-only';
import { db, firebaseStorageBucket } from '../firebaseAdmin';
import { invoiceFilename, invoiceStoragePath } from './invoiceModel.mjs';
import { renderInvoicePdf } from './invoicePdf';

const invoices = db.collection('shopInvoices');
const GENERATION_LEASE_MS = 5 * 60 * 1000;
function serialized(data) {
  const convert = (value) => value?.toDate ? value.toDate() : value;
  return { ...data, issuedAt: convert(data.issuedAt), dueDate: convert(data.dueDate), createdAt: convert(data.createdAt) };
}
function requireAvailable(snapshot) {
  if (!snapshot.exists) throw new Error('invoice_not_found');
  const invoice = { id: snapshot.id, ...snapshot.data() };
  if (invoice.pdf?.status === 'deleting') throw new Error('invoice_deleting');
  return invoice;
}
function validStoragePath(path) {
  if (typeof path !== 'string' || !path.startsWith('shop/invoices/') || path.includes('..')) throw new Error('invalid_invoice_path');
  return path;
}
async function removeFile(path) {
  await firebaseStorageBucket.file(validStoragePath(path)).delete({ ignoreNotFound: true });
}

export async function storeInvoicePdf(invoice) {
  const reference = invoices.doc(invoice.orderId);
  const generationId = crypto.randomUUID();
  // A persisted claim coordinates separate server processes. Expired claims can be
  // retried; each claim owns its own object so a late worker cannot overwrite it.
  const claimed = await db.runTransaction(async (transaction) => {
    const current = requireAvailable(await transaction.get(reference));
    const startedAt = current.pdf?.generationStartedAt;
    const startedTime = startedAt?.toMillis ? startedAt.toMillis() : new Date(startedAt ?? 0).getTime();
    if (current.pdf?.status === 'generating' && startedTime > Date.now() - GENERATION_LEASE_MS) throw new Error('invoice_generation_in_progress');
    const storagePath = `${invoiceStoragePath(current).replace(/\.pdf$/, '')}/${generationId}.pdf`;
    const cleanupPaths = [...new Set([...(current.pdf?.cleanupPaths ?? []), current.pdf?.storagePath].filter(Boolean))];
    cleanupPaths.forEach(validStoragePath);
    const pdf = { ...current.pdf, status: 'generating', storagePath, generatedAt: null, generationId, generationStartedAt: new Date(), cleanupPaths };
    transaction.update(reference, { pdf });
    return { ...current, pdf };
  });
  const file = firebaseStorageBucket.file(claimed.pdf.storagePath);
  let uploaded = false;
  try {
    const buffer = await renderInvoicePdf(serialized(claimed));
    // Avoid an upload if deletion won while rendering. The final transaction
    // handles deletion that starts after this check or during the upload.
    const beforeUpload = requireAvailable(await reference.get());
    if (beforeUpload.pdf.generationId !== generationId) throw new Error('invoice_generation_in_progress');
    uploaded = true;
    await file.save(buffer, { resumable: false, contentType: 'application/pdf', metadata: { contentType: 'application/pdf', cacheControl: 'private, max-age=0, no-store' } });
    await db.runTransaction(async (transaction) => {
      const current = requireAvailable(await transaction.get(reference));
      if (current.pdf.generationId !== generationId) throw new Error('invoice_generation_in_progress');
      transaction.update(reference, { pdf: { ...current.pdf, status: 'ready', generatedAt: new Date(), generationId: null, generationStartedAt: null } });
    });
    // Keep paths in metadata until cleanup succeeds, allowing a later explicit
    // deletion to retry cleanup after a Storage outage.
    try {
      for (const path of claimed.pdf.cleanupPaths) await removeFile(path);
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists && snapshot.get('pdf.status') === 'ready' && snapshot.get('pdf.storagePath') === claimed.pdf.storagePath) {
          transaction.update(reference, { pdf: { ...snapshot.data().pdf, cleanupPaths: [] } });
        }
      });
    } catch (error) { console.error('Unable to clean up superseded invoice PDF.', { orderId: invoice.orderId, error }); }
    return buffer;
  } catch (error) {
    if (uploaded) await removeFile(claimed.pdf.storagePath).catch((cleanupError) => console.error('Unable to clean up unfinished invoice PDF.', { orderId: invoice.orderId, error: cleanupError }));
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (snapshot.exists && snapshot.get('pdf.status') !== 'deleting' && snapshot.get('pdf.generationId') === generationId) {
        transaction.update(reference, { pdf: { ...snapshot.data().pdf, status: 'failed', generatedAt: null, generationId: null, generationStartedAt: null } });
      }
    }).catch(() => {});
    throw error;
  }
}

export async function generateInvoicePdfSafely(invoice) {
  try { return await storeInvoicePdf(invoice); }
  catch (error) {
    if (!['invoice_not_found', 'invoice_deleting', 'invoice_generation_in_progress'].includes(error?.message)) console.error('Invoice PDF generation failed.', { orderId: invoice.orderId, invoiceNumber: invoice.invoiceNumber, error });
    return null;
  }
}
export async function getInvoicePdf(orderId) {
  const reference = invoices.doc(orderId);
  const invoice = requireAvailable(await reference.get());
  const file = firebaseStorageBucket.file(validStoragePath(invoice.pdf?.storagePath ?? invoiceStoragePath(invoice)));
  if (invoice.pdf?.status === 'ready' && (await file.exists())[0]) {
    try {
      const [buffer] = await file.download();
      requireAvailable(await reference.get());
      return { invoice, buffer, filename: invoiceFilename(invoice.invoiceNumber) };
    } catch (error) {
      if (error?.code !== 404 && error?.code !== '404' && error?.code !== 'storage/object-not-found') throw error;
    }
  }
  const buffer = await storeInvoicePdf(invoice);
  requireAvailable(await reference.get());
  return { invoice, buffer, filename: invoiceFilename(invoice.invoiceNumber) };
}
export async function getInvoice(orderId) {
  const snapshot = await invoices.doc(orderId).get();
  return snapshot.exists && snapshot.get('pdf.status') !== 'deleting' ? { id: snapshot.id, ...snapshot.data() } : null;
}
