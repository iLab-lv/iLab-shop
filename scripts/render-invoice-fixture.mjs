import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildInvoiceSnapshot } from '../lib/invoices/invoiceModel.mjs';
import { renderInvoicePdf } from '../lib/invoices/invoicePdf.js';
// Local-only synthetic accounting data; this script never imports Firebase.
const [outputDirectory='output/pdf',lineCountText='18',paymentMethod='bank_transfer']=process.argv.slice(2);
const lineCount=Number(lineCountText);
if(!Number.isInteger(lineCount)||lineCount<1||lineCount>100||!['bank_transfer','cash_on_pickup'].includes(paymentMethod))throw new Error('Usage: node scripts/render-invoice-fixture.mjs [output-directory] [line-count:1..100] [bank_transfer|cash_on_pickup]');
const settings={sellerName:'SIA Invoice Fixture (TEST)',legalAddress:'Testa iela 1, Rīga, LV-0000',registrationNumber:'00000000000',vatNumber:'LV00000000000',bankName:'Test Bank',bic:'TESTLV00',iban:'LV00TEST0000000000000',invoicePrefix:'SH',paymentDueDays:7,electronicDocumentNote:'TESTA DOKUMENTS - Rēķins ir sagatavots elektroniski un ir derīgs bez paraksta'};
const items=Array.from({length:lineCount},(_,index)=>({productId:`product-${index}`,sku:20345+index,name:index===0?'iPhone 14 Pro displejs - Bērziņš':'Rezerves daļa ar latviešu rakstzīmēm',quantity:index%3+1,lineTotalCents:12100+index}));
const totalCents=items.reduce((sum,item)=>sum+item.lineTotalCents,0);
const order={customer:{name:'Jānis Bērziņš (TEST)',email:'invoice@example.invalid',phone:'+371 00000000',company:{name:'SIA Pārskaitījumu Saņēmējs (TEST)',registrationNumber:'00000000000',vatNumber:'LV00000000000'},billingAddress:'Testa iela 2, Rīga'},paymentMethod,tax:{pricesIncludeVat:true,vatRatePercent:21},items,totalCents};
const invoice=buildInvoiceSnapshot({order,orderId:'fixture-order',userId:'fixture-user',settings,sequenceYear:2026,sequenceNumber:1,issuedAt:new Date('2026-10-11T10:00:00Z')});
const buffer=await renderInvoicePdf(invoice);
await mkdir(outputDirectory,{recursive:true});
await writeFile(path.join(outputDirectory,'invoice-fixture.pdf'),buffer);
if(buffer.length<1000||buffer.subarray(0,4).toString()!=='%PDF')throw new Error('Invalid PDF output');
console.log(JSON.stringify({bytes:buffer.length,lineCount,paymentMethod,totals:invoice.totals,filename:path.join(outputDirectory,'invoice-fixture.pdf')}));
