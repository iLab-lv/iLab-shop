import 'server-only';
import { db, firebaseStorageBucket } from '../firebaseAdmin';
import { invoiceFilename } from './invoiceModel.mjs';
import { renderInvoicePdf } from './invoicePdf';

const invoices=db.collection('shopInvoices');
function serialized(data){const convert=(value)=>value?.toDate?value.toDate():value;return {...data,issuedAt:convert(data.issuedAt),dueDate:convert(data.dueDate),createdAt:convert(data.createdAt)};}
export async function storeInvoicePdf(invoice){const normalized=serialized(invoice),buffer=await renderInvoicePdf(normalized),file=firebaseStorageBucket.file(invoice.pdf.storagePath);await file.save(buffer,{resumable:false,contentType:'application/pdf',metadata:{contentType:'application/pdf',cacheControl:'private, max-age=0, no-store'}});await invoices.doc(invoice.orderId).update({pdf:{...invoice.pdf,status:'ready',generatedAt:new Date()}});return buffer;}
export async function generateInvoicePdfSafely(invoice){try{return await storeInvoicePdf(invoice);}catch(error){console.error('Invoice PDF generation failed.',{orderId:invoice.orderId,invoiceNumber:invoice.invoiceNumber,error});await invoices.doc(invoice.orderId).update({pdf:{...invoice.pdf,status:'failed',generatedAt:null}}).catch(()=>{});return null;}}
export async function getInvoicePdf(orderId){const snapshot=await invoices.doc(orderId).get();if(!snapshot.exists)throw new Error('invoice_not_found');const invoice={id:snapshot.id,...snapshot.data()};const file=firebaseStorageBucket.file(invoice.pdf.storagePath);if(invoice.pdf.status==='ready'&&(await file.exists())[0]){const[buffer]=await file.download();return{invoice,buffer,filename:invoiceFilename(invoice.invoiceNumber)};}const buffer=await storeInvoicePdf(invoice);return{invoice,buffer,filename:invoiceFilename(invoice.invoiceNumber)};}
export async function getInvoice(orderId){const snapshot=await invoices.doc(orderId).get();return snapshot.exists?{id:snapshot.id,...snapshot.data()}:null;}
