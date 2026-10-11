import 'server-only';
import { db } from './firebaseAdmin';
import { serializeAdminUser } from './adminUsers';
import { serializeOrder } from './shopOrders';
import { aggregateDashboardData, getDashboardMonthWindow } from './adminDashboardMetrics.mjs';

export async function getAdminDashboardData(now = new Date()) {
  const month = getDashboardMonthWindow(now), orders = db.collection('shopOrders'), users = db.collection('users');
  const pendingQuery = users.where('partnerStatus', '==', 'pending');
  const newOrdersQuery = orders.where('orderStatus', '==', 'new');
  const [monthlyOrders, monthlyUsers, pendingUsers, pendingCount, newOrders, newOrderCount, recentOrders] = await Promise.all([
    orders.where('createdAt', '>=', month.previousStart).where('createdAt', '<', month.nextStart).get(),
    users.where('createdAt', '>=', month.previousStart).where('createdAt', '<', month.nextStart).get(),
    pendingQuery.limit(5).get(),
    pendingQuery.count().get(),
    newOrdersQuery.limit(5).get(),
    newOrdersQuery.count().get(),
    orders.orderBy('createdAt', 'desc').limit(10).get(),
  ]);
  return aggregateDashboardData({ orders: monthlyOrders.docs.map((document) => serializeOrder(document)), users: monthlyUsers.docs.map((document) => serializeAdminUser(document.data(), document.id)), pendingApplications: pendingUsers.docs.map((document) => serializeAdminUser(document.data(), document.id)), pendingApplicationCount: pendingCount.data().count, newOrders: newOrders.docs.map((document) => serializeOrder(document)), newOrderCount: newOrderCount.data().count, recentOrders: recentOrders.docs.map((document) => serializeOrder(document)), now });
}
