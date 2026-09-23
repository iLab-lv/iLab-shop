export const ADMIN_USERS_PAGE_SIZE = 25;

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function identity(user) {
  return user.name || user.email || user.uid;
}

function dateValue(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareUsers(sort) {
  if (sort === 'nameAsc' || sort === 'nameDesc') {
    const direction = sort === 'nameDesc' ? -1 : 1;
    return (a, b) => direction * nameCollator.compare(identity(a), identity(b)) || a.uid.localeCompare(b.uid);
  }
  const oldest = sort === 'oldest';
  return (a, b) => {
    const aDate = dateValue(a.createdAt);
    const bDate = dateValue(b.createdAt);
    if (aDate === null && bDate !== null) return 1;
    if (bDate === null && aDate !== null) return -1;
    if (aDate !== bDate) return oldest ? aDate - bDate : bDate - aDate;
    return a.uid.localeCompare(b.uid);
  };
}

export function summarizeAdminUsers(users) {
  return users.reduce((summary, user) => {
    summary.total += 1;
    if (user.role === 'customer') summary.customers += 1;
    if (user.partnerStatus === 'approved') summary.approvedPartners += 1;
    if (user.partnerStatus === 'pending') summary.pendingApplications += 1;
    return summary;
  }, { total: 0, customers: 0, approvedPartners: 0, pendingApplications: 0 });
}

export function deriveAdminUsers(users, query) {
  const search = query.search.trim().toLocaleLowerCase();
  return users
    .filter((user) => {
      if (query.pendingOnly && user.partnerStatus !== 'pending') return false;
      if (query.role && user.role !== query.role) return false;
      if (query.status && user.status !== query.status) return false;
      if (!query.pendingOnly && query.partnerStatus && user.partnerStatus !== query.partnerStatus) return false;
      if (!search) return true;
      return [user.name, user.email, user.company?.name, user.uid]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(search));
    })
    .sort(compareUsers(query.sort));
}

export function getAdminUsersPage(users, page) {
  const start = (page - 1) * ADMIN_USERS_PAGE_SIZE;
  return users.slice(start, start + ADMIN_USERS_PAGE_SIZE);
}
