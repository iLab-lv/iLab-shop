import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInvoiceSnapshot } from '../lib/invoices/invoiceModel.mjs';
import { loadServerModule, memoryFirestore } from './helpers/load-server-module.mjs';

const settings={sellerName:'TEST Seller',legalAddress:'TEST address',registrationNumber:'00000000000',vatNumber:'LV00000000000',bankName:'TEST',bic:'TESTLV00',iban:'LV00TEST0000000000000',invoicePrefix:'SH',paymentDueDays:7,electronicDocumentNote:'TEST'};
const order={customer:{name:'TEST Buyer',email:'invoice@example.invalid',phone:'+37100000000',company:null},paymentMethod:'bank_transfer',tax:{pricesIncludeVat:true,vatRatePercent:21},items:[{productId:'p',sku:123,name:'TEST Part',quantity:1,lineTotalCents:121}],totalCents:121};
function fixture(status='pending'){
 const result=buildInvoiceSnapshot({order,orderId:'test-order',userId:'test-owner',settings,sequenceYear:2026,sequenceNumber:1,issuedAt:new Date('2026-11-03T00:00:00Z')});
 result.pdf.status=status;
 return result;
}
async function harness(options={}){
 let renders=0,saves=0,downloads=0;
 const updates=[],rendered=[];
 const initial=options.invoice===null?{}:{'shopInvoices/test-order':options.invoice??fixture(options.status)};
 const store=memoryFirestore({'shopOrders/test-order':{userId:'test-owner',items:[],stockRestoredAt:null},...initial});
 const db={...store.db,runTransaction:work=>store.db.runTransaction(tx=>work({...tx,update(ref,patch){updates.push(structuredClone(patch));if(options.metadataError&&patch.pdf?.status==='ready')throw options.metadataError;return tx.update(ref,patch);}}))};
 const buffer=Buffer.from('%PDF synthetic fixture');
 const files=new Map(options.exists?[[fixture().pdf.storagePath,buffer]]:[]),deleted=[];
 const firebaseStorageBucket={file(path){assert.match(path,/^shop\/invoices\//);return{exists:async()=>[files.has(path)],download:async()=>{downloads++;await options.beforeDownload?.();if(options.downloadError)throw options.downloadError;return[files.get(path)??buffer];},save:async(data,config)=>{saves++;assert.equal(data,buffer);assert.equal(config.metadata.cacheControl,'private, max-age=0, no-store');assert.equal(config.resumable,false);await options.beforeSave?.();if(options.saveError)throw options.saveError;files.set(path,data);},delete:async()=>{await options.beforeDelete?.();deleted.push(path);files.delete(path);}};}};
 const service=await loadServerModule('../../lib/invoices/invoiceService.js',{'server-only':{},'../firebaseAdmin':{db,firebaseStorageBucket},'./invoicePdf':{renderInvoicePdf:async(value)=>{renders++;rendered.push(structuredClone(value));await options.beforeRender?.();if(options.renderError)throw options.renderError;return buffer;}}});
 const orders=await loadServerModule('../../lib/shopOrders.js',{'server-only':{},'./firebaseAdmin':{db,firebaseStorageBucket,serverTimestamp:()=>new Date()},'./invoices/invoiceService':{generateInvoicePdfSafely:service.generateInvoicePdfSafely}});
 return {...service,deleteOrder:orders.deleteOrder,...store,counts:()=>({renders,saves,downloads}),invoice:()=>store.rows()['shopInvoices/test-order']??null,updates,rendered,buffer,files,deleted};
}

test('ready invoice streams private stored bytes without regeneration or accounting changes',async()=>{
 const h=await harness({status:'ready',exists:true}),before=structuredClone(h.invoice());
 const result=await h.getInvoicePdf('test-order');
 assert.equal(result.buffer,h.buffer);assert.equal(result.filename,'SH-2026-000001.pdf');
 assert.deepEqual(h.counts(),{renders:0,saves:0,downloads:1});assert.deepEqual(h.invoice(),before);
});

test('missing/failed PDF regenerates from the immutable snapshot and updates only operational metadata',async()=>{
 for(const status of ['pending','failed','ready']){
  const h=await harness({status,exists:false}),before=structuredClone(h.invoice());
  const result=await h.getInvoicePdf('test-order');
  assert.equal(result.buffer,h.buffer);assert.deepEqual(h.counts(),{renders:1,saves:1,downloads:0});
  const {pdf:renderPdf,...renderAccounting}=h.rendered[0];
  assert.equal(renderPdf.status,'generating');assert.deepEqual(renderAccounting,{id:'test-order',...Object.fromEntries(Object.entries(before).filter(([key])=>key!=='pdf'))});
  assert.deepEqual(Object.keys(h.updates[0]),['pdf']);
  assert.equal(h.invoice().pdf.status,'ready');assert.ok(h.invoice().pdf.generatedAt instanceof Date);
  const {pdf:ignoredBefore,...accountingBefore}=before,{pdf:ignoredAfter,...accountingAfter}=h.invoice();
  assert.ok(ignoredBefore&&ignoredAfter);assert.deepEqual(accountingAfter,accountingBefore);
 }
});

test('object disappearing between existence check and download self-heals without a new invoice number',async()=>{
 const h=await harness({status:'ready',exists:true,downloadError:Object.assign(new Error('not found'),{code:404})});
 const result=await h.getInvoicePdf('test-order');
 assert.equal(result.buffer,h.buffer);assert.deepEqual(h.counts(),{renders:1,saves:1,downloads:1});
 assert.equal(h.invoice().invoiceNumber,'SH - 2026 - 000001');
});

test('non-missing storage failures propagate without overwriting stored invoice data',async()=>{
 const error=Object.assign(new Error('permission denied'),{code:403}),h=await harness({status:'ready',exists:true,downloadError:error}),before=structuredClone(h.invoice());
 await assert.rejects(h.getInvoicePdf('test-order'),error);
 assert.deepEqual(h.counts(),{renders:0,saves:0,downloads:1});assert.deepEqual(h.invoice(),before);
});

test('post-order rendering/upload failures are non-fatal and leave accounting snapshots recoverable',async()=>{
 for(const options of [{renderError:new Error('font unavailable')},{saveError:new Error('storage unavailable')}]){
  const h=await harness(options),before=structuredClone(h.invoice());
  assert.equal(await h.generateInvoicePdfSafely(before),null);
  assert.equal(h.invoice().pdf.status,'failed');assert.equal(h.invoice().pdf.generatedAt,null);
  assert.deepEqual(h.invoice().totals,before.totals);assert.equal(h.invoice().invoiceNumber,before.invoiceNumber);
 }
});

test('metadata outage after PDF storage cleans the uncommitted object and remains recoverable',async()=>{
 const h=await harness({metadataError:new Error('metadata unavailable')});
 assert.equal(await h.generateInvoicePdfSafely(h.invoice()),null);
 assert.equal(h.counts().saves,1);assert.equal(h.invoice().pdf.status,'failed');assert.equal(h.files.size,0);
});

test('missing invoice never renders or writes storage',async()=>{
 const h=await harness({invoice:null});
 await assert.rejects(h.getInvoicePdf('test-order'),/invoice_not_found/);
 assert.deepEqual(h.counts(),{renders:0,saves:0,downloads:0});assert.equal(await h.getInvoice('test-order'),null);
});

test('a missing operational PDF record self-heals without changing invoice accounting values',async()=>{
 const invoice=fixture();delete invoice.pdf;const h=await harness({invoice});
 await h.getInvoicePdf('test-order');assert.equal(h.invoice().pdf.status,'ready');assert.equal(h.counts().saves,1);
 const {pdf,...after}=h.invoice();assert.ok(pdf);assert.deepEqual(after,invoice);
});

test('generation rereads immutable accounting values instead of rendering a stale caller snapshot',async()=>{
 const h=await harness(),invoice=fixture();
 await h.storeInvoicePdf({...invoice,buyer:{name:'stale buyer'},issuedAt:new Date(0),totals:{grossCents:1}});
 assert.deepEqual(h.rendered[0].issuedAt,invoice.issuedAt);assert.deepEqual(h.rendered[0].buyer,invoice.buyer);assert.deepEqual(h.rendered[0].totals,invoice.totals);
});

function gate(){let release,entered;const arrived=new Promise(resolve=>{entered=resolve;}),waiting=new Promise(resolve=>{release=resolve;});return{arrived,release,pause:async()=>{entered();await waiting;}};}

test('concurrent missing-PDF requests coordinate one generator and preserve accounting values',async()=>{
 const render=gate(),h=await harness({beforeRender:render.pause}),before=structuredClone(h.invoice());
 const first=h.getInvoicePdf('test-order');await render.arrived;
 await assert.rejects(h.getInvoicePdf('test-order'),/invoice_generation_in_progress/);
 assert.equal(h.counts().renders,1);render.release();await first;
 await h.getInvoicePdf('test-order');assert.deepEqual(h.counts(),{renders:1,saves:1,downloads:1});assert.equal(h.files.size,1);
 const {pdf:beforePdf,...beforeAccounting}=before,{pdf:afterPdf,...afterAccounting}=h.invoice();
 assert.ok(beforePdf&&afterPdf);assert.deepEqual(afterAccounting,beforeAccounting);
});

test('deletion while rendering prevents upload, document recreation and duplicate stock changes',async()=>{
 const render=gate(),h=await harness({beforeRender:render.pause});
 const generated=h.getInvoicePdf('test-order');const rejected=assert.rejects(generated,/invoice_not_found|invoice_deleting/);await render.arrived;
 await h.deleteOrder('test-order',{restoreStock:false});render.release();await rejected;
 assert.equal(h.invoice(),null);assert.equal(h.files.size,0);assert.equal(h.counts().saves,0);
 assert.equal(h.rows()['shopOrderRequests/test-order'].status,'deleted');
 await assert.rejects(h.getInvoicePdf('test-order'),/invoice_not_found/);
});

test('deletion during upload removes the late object after the upload finishes',async()=>{
 const upload=gate(),h=await harness({beforeSave:upload.pause});
 const generated=h.getInvoicePdf('test-order');const rejected=assert.rejects(generated,/invoice_not_found|invoice_deleting/);await upload.arrived;
 const claimedPath=h.invoice().pdf.storagePath;
 await h.deleteOrder('test-order',{restoreStock:false});upload.release();await rejected;
 assert.equal(h.invoice(),null);assert.equal(h.files.size,0);assert.equal(h.counts().saves,1);
 assert.ok(h.deleted.filter(path=>path===claimedPath).length>=2);
});

test('a deletion Storage outage preserves a retryable marker and blocks all regeneration',async()=>{
 let blocked=true;const h=await harness({status:'ready',exists:true,beforeDelete:async()=>{if(blocked)throw new Error('temporary storage outage');}});
 await assert.rejects(h.deleteOrder('test-order',{restoreStock:false}),/storage outage/);
 assert.equal(h.invoice().pdf.status,'deleting');assert.ok(h.rows()['shopOrders/test-order']);
 assert.equal(await h.getInvoice('test-order'),null);
 await assert.rejects(h.getInvoicePdf('test-order'),/invoice_deleting/);assert.equal(h.counts().renders,0);
 blocked=false;await h.deleteOrder('test-order',{restoreStock:false});assert.equal(h.invoice(),null);assert.equal(h.files.size,0);
});

test('an expired generation can recover without a late worker overwriting its PDF',async()=>{
 const render=gate();let renderCalls=0;const h=await harness({beforeRender:async()=>{if(++renderCalls===1)await render.pause();}});
 const first=h.getInvoicePdf('test-order');const rejected=assert.rejects(first,/invoice_generation_in_progress/);await render.arrived;
 const reference=h.db.collection('shopInvoices').doc('test-order');
 await h.db.runTransaction(async tx=>{const snapshot=await tx.get(reference);tx.update(reference,{pdf:{...snapshot.data().pdf,generationStartedAt:new Date(0)}});});
 await h.getInvoicePdf('test-order');const readyPath=h.invoice().pdf.storagePath;
 render.release();await rejected;assert.equal(h.invoice().pdf.storagePath,readyPath);assert.equal(h.invoice().pdf.status,'ready');assert.equal(h.files.size,1);
});

test('deletion during an already-authorized download returns missing instead of stale bytes',async()=>{
 const download=gate(),h=await harness({status:'ready',exists:true,beforeDownload:download.pause});
 const streamed=h.getInvoicePdf('test-order');const rejected=assert.rejects(streamed,/invoice_not_found|invoice_deleting/);await download.arrived;
 await h.deleteOrder('test-order',{restoreStock:false});download.release();await rejected;assert.equal(h.files.size,0);
});

async function routeHarness(){
 let session=null,sessionError=null,found=fixture(),pdfError=null,reads=0,generations=0;
 const route=await loadServerModule('../../app/api/invoices/[orderId]/route.js',{
  '../../../../lib/auth/sessionAuth':{getSessionUserProfile:async()=>{if(sessionError)throw sessionError;return session;}},
  '../../../../lib/invoices/invoiceService':{getInvoice:async()=>{reads++;return found;},getInvoicePdf:async()=>{generations++;if(pdfError)throw pdfError;return{buffer:Buffer.from('%PDF fixture'),filename:'SH-2026-000001.pdf'};}},
 });
 return{...route,setSession(value){session=value;},setSessionError(error){sessionError=error;},setFound(value){found=value;},setPdfError(error){pdfError=error;},counts:()=>({reads,generations})};
}
const session=(uid='test-owner',role='customer',status='active')=>({token:{uid},profile:{role,status}});
const request=(query='')=>new Request(`https://example.invalid/shop/api/invoices/test-order${query}`);
const context={params:Promise.resolve({orderId:'test-order'})};
function privateResponse(response,status){assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'private, no-store');}

test('invoice route denies anonymous/inactive/cross-account customers before PDF reads or regeneration',async()=>{
 const h=await routeHarness();
 privateResponse(await h.GET(request(),context),401);assert.deepEqual(h.counts(),{reads:0,generations:0});
 h.setSession(session('test-owner','customer','disabled'));
 privateResponse(await h.GET(request(),context),401);assert.equal(h.counts().reads,0);
 h.setSession(session('other-customer'));
 privateResponse(await h.GET(request(),context),403);assert.deepEqual(h.counts(),{reads:1,generations:0});
});

test('invoice owner and active staff/admin can view/download PDF using private responses',async()=>{
 const h=await routeHarness();
 for(const [identity,query,disposition]of [[session(),'','attachment'],[session('staff','staff'),'?view=1','inline'],[session('admin','admin'),'','attachment']]){
  h.setSession(identity);const response=await h.GET(request(query),context);privateResponse(response,200);
  assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),new RegExp(`^${disposition};`));
  assert.match(await response.text(),/^%PDF/);
 }
});

test('invoice route validation/missing errors remain private and never generate PDFs',async()=>{
 const h=await routeHarness();h.setSession(session());
 privateResponse(await h.GET(request(),{params:Promise.resolve({orderId:'bad/id'})}),400);
 h.setFound(null);privateResponse(await h.GET(request(),context),404);assert.equal(h.counts().generations,0);
});

test('invoice route sanitizes session and storage outages into controlled private responses',async()=>{
 const h=await routeHarness();h.setSessionError(new Error('private Firebase diagnostic'));
 const authFailure=await h.GET(request(),context);privateResponse(authFailure,503);assert.doesNotMatch(await authFailure.text(),/Firebase|diagnostic/);
 h.setSessionError(null);h.setSession(session());h.setPdfError(new Error('private bucket path'));
 const pdfFailure=await h.GET(request(),context);privateResponse(pdfFailure,503);assert.doesNotMatch(await pdfFailure.text(),/bucket|path/);
});

test('invoice route maps deletion and generation races to private 404/409 responses',async()=>{
 const h=await routeHarness();h.setSession(session());
 for(const [error,status]of [['invoice_not_found',404],['invoice_deleting',409],['invoice_generation_in_progress',409],['invalid_invoice_path',409]]){
  h.setPdfError(new Error(error));const response=await h.GET(request(),context);privateResponse(response,status);
  assert.doesNotMatch(await response.text(),/invoice_not_found|invoice_deleting|invoice_generation_in_progress/);
 }
});
