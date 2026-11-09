import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { hasPermission, isActiveUser, PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { getInvoice, getInvoicePdf } from '../../../../lib/invoices/invoiceService';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const privateHeaders={'Cache-Control':'private, no-store'};
const failure=(error,status)=>Response.json({error},{status,headers:privateHeaders});
export async function GET(request,{params}){
 let orderId;
 try{
  const session=await getSessionUserProfile();
  if(!session?.token?.uid||!isActiveUser(session.profile))return failure('Authentication is required.',401);
  ({orderId}=await params);
  if(typeof orderId!=='string'||!orderId||orderId.includes('/'))return failure('Invalid invoice.',400);
  const invoice=await getInvoice(orderId);
  if(!invoice)return failure('Invoice not found.',404);
  const owner=invoice.userId===session.token.uid,admin=hasPermission(session.profile,PERMISSIONS.ACCESS_SHOP_ADMIN);
  if(!owner&&!admin)return failure('You cannot access this invoice.',403);
  const{buffer,filename}=await getInvoicePdf(orderId);
  const disposition=new URL(request.url).searchParams.get('view')==='1'?'inline':'attachment';
  return new Response(buffer,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${disposition}; filename="${filename}"`,...privateHeaders}});
 }catch(error){
  if(error?.message==='invoice_not_found')return failure('Invoice not found.',404);
  if(['invoice_deleting','invoice_generation_in_progress'].includes(error?.message))return failure('Invoice is being updated. Please try again.',409);
  if(error?.message==='invalid_invoice_path')return failure('Invoice file is unavailable. Please contact support.',409);
  console.error('Unable to download invoice.',{orderId,error});
  return failure('Invoice PDF is temporarily unavailable. Please try again.',503);
 }
}
