'use strict';

/**
 * Carga canônica — Datas Comemorativas (calendário do marketing / designer).
 * Ano de referência: 2026. Clique → Explorer ?niche={category_slug}.
 */
const { slugifyCategory } = require('./marketing-calendar-rules');

/** @type {{ title: string, eventDate: string, icon: string, badge?: string|null }[]} */
const DATAS_COMEMORATIVAS_2026 = [
  { title: 'Dia Internacional do Obrigado', eventDate: '2026-01-11', icon: '🙏' },
  { title: 'Dia do Policial', eventDate: '2026-01-21', icon: '👮' },
  { title: 'Dia de Nossa Senhora de Lourdes', eventDate: '2026-02-11', icon: '🌹' },
  { title: 'Carnaval', eventDate: '2026-02-14', icon: '🎭', badge: 'Em alta' },
  { title: 'Volta às Aulas', eventDate: '2026-02-02', icon: '🎓' },
  { title: 'Dia do Consumidor', eventDate: '2026-03-15', icon: '🛒' },
  { title: 'Dia Internacional da Mulher', eventDate: '2026-03-08', icon: '👩', badge: 'Mais buscado' },
  { title: 'Semana Santa', eventDate: '2026-03-29', icon: '🌿' },
  { title: 'Dia do Coordenador Pedagógico', eventDate: '2026-04-04', icon: '👩‍🏫' },
  { title: 'Páscoa', eventDate: '2026-04-05', icon: '🐰', badge: 'Em alta' },
  { title: 'Tiradentes', eventDate: '2026-04-21', icon: '🎖️' },
  { title: 'Dia do Trabalho', eventDate: '2026-05-01', icon: '👷' },
  { title: 'Dia das Mães', eventDate: '2026-05-10', icon: '👩‍👧', badge: 'Mais buscado' },
  { title: 'Dia da Enfermagem', eventDate: '2026-05-12', icon: '👩‍⚕️' },
  { title: 'Dia da Família', eventDate: '2026-05-15', icon: '👨‍👩‍👧' },
  { title: 'Dia do Gari', eventDate: '2026-05-16', icon: '🧹' },
  { title: 'Dia Mundial das Abelhas', eventDate: '2026-05-20', icon: '🐝' },
  { title: 'Dia Mundial do Meio Ambiente', eventDate: '2026-06-05', icon: '🌎' },
  { title: 'Copa do Mundo', eventDate: '2026-06-11', icon: '🌍', badge: 'Em alta' },
  { title: 'Copa do Mundo Brasil 2026', eventDate: '2026-06-11', icon: '🇧🇷', badge: 'Em alta' },
  { title: 'Dia dos Namorados', eventDate: '2026-06-12', icon: '❤️', badge: 'Mais buscado' },
  { title: 'São João', eventDate: '2026-06-24', icon: '🔥' },
  { title: 'Festa Junina', eventDate: '2026-06-24', icon: '🌽' },
  { title: 'Dia dos Bombeiros', eventDate: '2026-07-02', icon: '👨‍🚒' },
  { title: 'Dia da Revolução Constitucionalista', eventDate: '2026-07-09', icon: '⚔️' },
  { title: 'Dia do Artista', eventDate: '2026-08-08', icon: '🎭' },
  { title: 'Dia dos Pais', eventDate: '2026-08-09', icon: '👨‍👧‍👦', badge: 'Mais buscado' },
  { title: 'Dia do Estudante', eventDate: '2026-08-11', icon: '🎒' },
  { title: 'Dia do Profissional de TI', eventDate: '2026-08-15', icon: '👨‍💻' },
  { title: 'Dia Mundial da Fotografia', eventDate: '2026-08-19', icon: '📷' },
  { title: 'Setembro Amarelo', eventDate: '2026-09-01', icon: '💛', badge: 'Em alta' },
  { title: 'Setembro Verde', eventDate: '2026-09-01', icon: '💚' },
  { title: 'Independência do Brasil', eventDate: '2026-09-07', icon: '🇧🇷' },
  { title: 'Dia do Cliente', eventDate: '2026-09-15', icon: '🛒', badge: 'Vale conferir' },
  { title: 'Dia da Árvore', eventDate: '2026-09-21', icon: '🌳' },
  { title: 'Início da Primavera', eventDate: '2026-09-22', icon: '🌸' },
  { title: 'Outubro Rosa', eventDate: '2026-10-01', icon: '🎀', badge: 'Em alta' },
  { title: 'Eleições', eventDate: '2026-10-04', icon: '🗳️' },
  { title: 'Dia dos Animais', eventDate: '2026-10-04', icon: '🐾' },
  { title: 'Dia das Crianças', eventDate: '2026-10-12', icon: '🧒', badge: 'Mais buscado' },
  { title: 'Dia dos Professores', eventDate: '2026-10-15', icon: '👨‍🏫' },
  { title: 'Dia do Médico', eventDate: '2026-10-18', icon: '🩺' },
  { title: 'Finados', eventDate: '2026-11-02', icon: '🕯️' },
  { title: 'ENEM', eventDate: '2026-11-08', icon: '📚' },
  { title: 'Proclamação da República', eventDate: '2026-11-15', icon: '🏛️' },
  { title: 'Black Friday', eventDate: '2026-11-27', icon: '🖤', badge: 'Mais buscado' },
  { title: 'Dia Internacional para a Abolição da Escravatura', eventDate: '2026-12-02', icon: '🕊️' },
  { title: 'Natal', eventDate: '2026-12-25', icon: '🎄', badge: 'Mais buscado' },
  { title: 'Ano Novo', eventDate: '2026-12-31', icon: '🎆', badge: 'Em alta' },
];

function buildMarketingCalendarSeedRows(now = new Date()) {
  const sorted = [...DATAS_COMEMORATIVAS_2026].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate)
  );

  return sorted.map((row, index) => ({
    title: row.title,
    event_date: row.eventDate,
    icon: row.icon,
    badge: row.badge ?? null,
    category_slug: slugifyCategory(row.title),
    sort_order: (index + 1) * 10,
    active: true,
    created_at: now,
    updated_at: now,
  }));
}

module.exports = {
  DATAS_COMEMORATIVAS_2026,
  buildMarketingCalendarSeedRows,
};
