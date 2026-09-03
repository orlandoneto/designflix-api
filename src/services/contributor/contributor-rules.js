/**
 * Regras do domínio Colaborador / conta (sem pagamento).
 * Testável sem DB.
 */

const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];
const ACCOUNT_STATUSES = ['none', 'pending', 'active', 'rejected'];

const PROFILE_ALLOWLIST = [
  'name',
  'email',
  'phone',
  'countryCode',
  'photo',
  'username',
  'chavePix',
];

const PROFILE_FORBIDDEN = [
  'contributor',
  'contributorStatus',
  'contributor_status',
  'balance',
  'password',
  'acceptTerms',
  'accept_terms',
  'status',
  'id',
];

const ABOUT_MAX = 500;
const TERMS_VERSION = 'collaboration-2026-09';

function resolveContributorStatus(user) {
  if (!user) return 'none';
  const raw = user.contributorStatus || user.contributor_status;
  if (raw && ACCOUNT_STATUSES.includes(String(raw))) {
    return String(raw);
  }
  return Number(user.contributor) === 1 ? 'active' : 'none';
}

function isActiveContributor(user) {
  return resolveContributorStatus(user) === 'active';
}

function normalizeUsername(value) {
  if (value == null) return value;
  return String(value).replace(/^@/, '').trim().toLowerCase();
}

function pickProfilePatch(body) {
  const source = body && typeof body === 'object' ? body : {};
  const forbidden = PROFILE_FORBIDDEN.filter((key) => Object.prototype.hasOwnProperty.call(source, key));
  const patch = {};
  for (const key of PROFILE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      patch[key] = source[key];
    }
  }
  if (source.fullName !== undefined && patch.name === undefined) {
    patch.name = source.fullName;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'username')) {
    const username = normalizeUsername(patch.username);
    if (!username) {
      delete patch.username;
    } else {
      patch.username = username;
    }
  }
  return { patch, forbidden };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateApplicationBody(body) {
  const source = body && typeof body === 'object' ? body : {};
  const portfolioUrl = String(source.portfolioUrl || source.portfolio_url || '').trim();
  const instagram = String(source.instagram || '').trim();
  const behance = String(source.behance || '').trim();
  const about = String(source.about || '').trim();
  const accepted =
    source.acceptCollaborationTerms === true ||
    source.accept_collaboration_terms === true;

  if (!portfolioUrl) {
    return { ok: false, message: 'URL do portfólio ou site é obrigatória' };
  }
  if (!isHttpUrl(portfolioUrl)) {
    return { ok: false, message: 'URL do portfólio inválida' };
  }
  if (!about) {
    return { ok: false, message: 'Conte um pouco sobre você e seu trabalho' };
  }
  if (about.length > ABOUT_MAX) {
    return { ok: false, message: `Sobre você deve ter no máximo ${ABOUT_MAX} caracteres` };
  }
  if (!accepted) {
    return { ok: false, message: 'Aceite os termos de colaboração para continuar' };
  }

  return {
    ok: true,
    data: {
      portfolioUrl,
      instagram: instagram || null,
      behance: behance || null,
      about,
      termsVersion: TERMS_VERSION,
    },
  };
}

function mapApplication(row) {
  if (!row) return null;
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    userId: plain.userId || plain.user_id,
    portfolioUrl: plain.portfolioUrl || plain.portfolio_url,
    instagram: plain.instagram || null,
    behance: plain.behance || null,
    about: plain.about,
    status: plain.status,
    termsVersion: plain.termsVersion || plain.terms_version,
    termsAcceptedAt: plain.termsAcceptedAt || plain.terms_accepted_at,
    reviewedAt: plain.reviewedAt || plain.reviewed_at || null,
    reviewNote: plain.reviewNote || plain.review_note || null,
    createdAt: plain.createdAt || plain.created_at,
  };
}

function mapAccount(user, application) {
  if (!user) return null;
  const plain = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  const contributorStatus = resolveContributorStatus(plain);
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    photo: plain.photo || null,
    phone: plain.phone || null,
    countryCode: plain.countryCode || plain.country_code || null,
    username: plain.username || null,
    contributor: contributorStatus === 'active' ? 1 : Number(plain.contributor) === 1 ? 1 : 0,
    contributorStatus,
    acceptTerms: plain.acceptTerms ?? plain.accept_terms,
    chavePix: plain.chavePix || plain.chave_pix || null,
    createdAt: plain.createdAt || plain.created_at,
    application: mapApplication(application),
  };
}

module.exports = {
  APPLICATION_STATUSES,
  ACCOUNT_STATUSES,
  PROFILE_ALLOWLIST,
  PROFILE_FORBIDDEN,
  ABOUT_MAX,
  TERMS_VERSION,
  resolveContributorStatus,
  isActiveContributor,
  pickProfilePatch,
  validateApplicationBody,
  mapApplication,
  mapAccount,
};
