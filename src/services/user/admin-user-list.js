const { resolveContributorStatus } = require('../contributor/contributor-rules');

/**
 * Papéis de conta pública (não confundir com admin JWT).
 * - customer: sempre true (usuário comum da plataforma)
 * - contributor: true só com contributorStatus active
 * Um usuário pode ter os dois ao mesmo tempo.
 */
function mapUserRoles(user) {
  const contributorStatus = resolveContributorStatus(user);
  const contributor = contributorStatus === 'active';
  return {
    customer: true,
    contributor,
  };
}

function mapAdminUserListItem(user) {
  if (!user) return null;
  const plain = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  const contributorStatus = resolveContributorStatus(plain);
  const roles = mapUserRoles(plain);

  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    photo: plain.photo || null,
    username: plain.username || null,
    phone: plain.phone || null,
    contributor: roles.contributor ? 1 : 0,
    contributorStatus,
    roles,
    createdAt: plain.createdAt || plain.created_at || null,
  };
}

/**
 * @param {'all'|'contributor'|'customer_only'} role
 */
function matchesRoleFilter(item, role) {
  const key = String(role || 'all').trim();
  if (key === 'contributor') return Boolean(item.roles?.contributor);
  if (key === 'customer_only') return Boolean(item.roles?.customer) && !item.roles?.contributor;
  return true;
}

function matchesSearch(item, q) {
  const term = String(q || '').trim().toLowerCase();
  if (!term) return true;
  const hay = [item.name, item.email, item.username]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(term);
}

module.exports = {
  mapUserRoles,
  mapAdminUserListItem,
  matchesRoleFilter,
  matchesSearch,
};
