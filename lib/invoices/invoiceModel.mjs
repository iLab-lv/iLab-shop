import { splitVatInclusivePrice } from '../commerce.mjs';

export const INVOICE_TEMPLATE_VERSION = 1;
export const INVOICE_SEQUENCE_COLLECTION = 'shopInvoiceSequences';

export function rigaYear(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Riga', year: 'numeric' }).format(date));
}

export function formatInvoiceNumber(prefix, year, sequenceNumber) {
  if (!/^[A-Z0-9]{1,12}$/.test(prefix) || !Number.isInteger(year) || !Number.isInteger(sequenceNumber) || sequenceNumber < 1) throw new Error('invalid_invoice_number');
  return `${prefix} - ${year} - ${String(sequenceNumber).padStart(6, '0')}`;
}

export function invoiceFilename(invoiceNumber) { return `${invoiceNumber.replace(/\s+-\s+/g, '-').replace(/[^A-Z0-9-]/gi, '')}.pdf`; }
export function invoiceStoragePath(invoice) { return `shop/invoices/${invoice.sequenceYear}/${invoiceFilename(invoice.invoiceNumber)}`; }

export function invoiceTaxLines(order) {
  const rate = order.tax?.vatRatePercent;
  if (order.tax?.pricesIncludeVat !== true || !Number.isFinite(rate)) throw new Error('invalid_order_tax');
  const items = order.items.map((item) => {
    const lineGrossCents = item.lineTotalCents;
    const split = splitVatInclusivePrice(lineGrossCents, rate);
    if (!split) throw new Error('invalid_order_tax');
    return { productId:item.productId,sku:item.sku,name:item.name,quantity:item.quantity,unitLabel:'gab.',lineGrossCents,lineNetCents:split.netCents,vatCents:split.vatCents,vatRatePercent:rate };
  });
  const netCents=items.reduce((sum,item)=>sum+item.lineNetCents,0),vatCents=items.reduce((sum,item)=>sum+item.vatCents,0);
  if(netCents+vatCents!==order.totalCents)throw new Error('invoice_total_mismatch');
  return {items,totals:{netCents,vatCents,grossCents:order.totalCents}};
}

export function addCalendarDays(date, days) { const result=new Date(date); result.setUTCDate(result.getUTCDate()+days); return result; }

export function buildInvoiceSnapshot({order,orderId,userId,settings,sequenceYear,sequenceNumber,issuedAt=new Date()}) {
  const invoiceNumber=formatInvoiceNumber(settings.invoicePrefix,sequenceYear,sequenceNumber),taxLines=invoiceTaxLines(order),bankTransfer=order.paymentMethod==='bank_transfer';
  return { orderId,userId,invoiceNumber,sequenceYear,sequenceNumber,status:'issued',issuedAt,dueDate:bankTransfer?addCalendarDays(issuedAt,settings.paymentDueDays):null,currency:'EUR',seller:{legalName:settings.sellerName,legalAddress:settings.legalAddress,registrationNumber:settings.registrationNumber,vatNumber:settings.vatNumber,bankName:settings.bankName,bic:settings.bic,iban:settings.iban},buyer:{name:order.customer.name,email:order.customer.email,phone:order.customer.phone,companyName:order.customer.company?.name??'',registrationNumber:order.customer.company?.registrationNumber??'',vatNumber:order.customer.company?.vatNumber??'',address:''},transactionDescription:'preču pārdošana',paymentMethod:order.paymentMethod,paymentReference:bankTransfer?`Rēķins ${invoiceNumber}`:null,tax:{pricesIncludeVat:true,vatRatePercent:order.tax.vatRatePercent},items:taxLines.items,totals:taxLines.totals,electronicDocumentNote:settings.electronicDocumentNote,pdf:{status:'pending',storagePath:invoiceStoragePath({sequenceYear,invoiceNumber}),generatedAt:null,templateVersion:INVOICE_TEMPLATE_VERSION},createdAt:issuedAt };
}

const ones=['nulle','viens','divi','trīs','četri','pieci','seši','septiņi','astoņi','deviņi','desmit','vienpadsmit','divpadsmit','trīspadsmit','četrpadsmit','piecpadsmit','sešpadsmit','septiņpadsmit','astoņpadsmit','deviņpadsmit'];
const tens=['','','divdesmit','trīsdesmit','četrdesmit','piecdesmit','sešdesmit','septiņdesmit','astoņdesmit','deviņdesmit'];
function underThousand(value){const parts=[];if(value>=100){const hundreds=Math.floor(value/100);parts.push(hundreds===1?'simts':`${ones[hundreds]} simti`);value%=100;}if(value>=20){parts.push(tens[Math.floor(value/10)]);value%=10;}if(value)parts.push(ones[value]);return parts.join(' ');}
export function integerToLatvianWords(value){if(!Number.isInteger(value)||value<0||value>999999999)throw new Error('invalid_amount');if(value===0)return ones[0];const parts=[],millions=Math.floor(value/1000000);if(millions){parts.push(millions===1?'viens miljons':`${underThousand(millions)} miljoni`);value%=1000000;}const thousands=Math.floor(value/1000);if(thousands){parts.push(thousands===1?'viens tūkstotis':`${underThousand(thousands)} tūkstoši`);value%=1000;}if(value)parts.push(underThousand(value));return parts.join(' ');}
export function amountToLatvianWords(cents){if(!Number.isInteger(cents)||cents<0)throw new Error('invalid_amount');const euros=Math.floor(cents/100),centValue=cents%100,centLabel=centValue%100!==11&&centValue%10===1?'cents':'centi',words=integerToLatvianWords(euros);return `${words.charAt(0).toUpperCase()}${words.slice(1)} eiro, ${String(centValue).padStart(2,'0')} ${centLabel}`;}
export function formatLatvianMoney(cents){return new Intl.NumberFormat('lv-LV',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}).format(cents/100);}
export function formatLatvianDate(value){const date=value?.toDate?value.toDate():new Date(value);return new Intl.DateTimeFormat('lv-LV',{timeZone:'Europe/Riga',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
