'use strict';

/**
 * Catálogo canônico (estilo concorrente) — regras recorrentes.
 * Materializado por ano em `marketing_calendar_event`.
 *
 * rule:
 * - fixed: month+day
 * - month_span: campanha do mês inteiro (01 → último dia)
 * - nth_weekday: weekday 0=dom … 6=sáb, nth 1..5 | -1
 * - easter_offset: dias relativos à Páscoa (ex.: Carnaval = -47)
 *
 * `durationDays` (opcional) transforma uma data única em período.
 */

/** @type {Array<{ title: string, icon: string, badge?: string|null, rule: string, month?: number, day?: number, weekday?: number, nth?: number, easterOffset?: number, durationDays?: number }>} */
const MARKETING_CALENDAR_CATALOG = [
  // ——— Janeiro ———
  { title: 'Ano Novo / Confraternização Universal', icon: '🎆', rule: 'fixed', month: 1, day: 1 },
  { title: 'Dia de Reis', icon: '🧙', rule: 'fixed', month: 1, day: 6 },
  { title: 'Dia do Astronauta', icon: '🚀', rule: 'fixed', month: 1, day: 9 },
  { title: 'Dia Internacional do Obrigado', icon: '🙏', rule: 'fixed', month: 1, day: 11 },
  { title: 'Dia do Farmacêutico', icon: '💊', rule: 'fixed', month: 1, day: 20 },
  { title: 'Dia da Saudade', icon: '🎨', rule: 'fixed', month: 1, day: 30 },

  // ——— Fevereiro ———
  { title: 'Dia de Nossa Senhora de Lourdes', icon: '🌹', rule: 'fixed', month: 2, day: 11 },
  { title: 'Dia Mundial do Rádio', icon: '📻', rule: 'fixed', month: 2, day: 13 },
  { title: 'Dia de São Valentim / Valentine\'s Day', icon: '💘', rule: 'fixed', month: 2, day: 14 },
  { title: 'Carnaval', icon: '🎭', badge: 'Em alta', rule: 'easter_offset', easterOffset: -47 },
  { title: 'Volta às Aulas', icon: '🎓', rule: 'fixed', month: 2, day: 2 },

  // ——— Março ———
  { title: 'Dia Internacional da Mulher', icon: '👩', badge: 'Mais buscado', rule: 'fixed', month: 3, day: 8 },
  { title: 'Dia Nacional dos Animais', icon: '🐾', rule: 'fixed', month: 3, day: 14 },
  { title: 'Dia do Consumidor', icon: '🛒', rule: 'fixed', month: 3, day: 15 },
  { title: 'Dia Mundial da Água', icon: '💧', rule: 'fixed', month: 3, day: 22 },
  { title: 'Semana Santa', icon: '✝️', rule: 'easter_offset', easterOffset: -7 },

  // ——— Abril ———
  { title: 'Páscoa', icon: '🐰', badge: 'Em alta', rule: 'easter_offset', easterOffset: 0 },
  { title: 'Dia do Jornalista', icon: '📰', rule: 'fixed', month: 4, day: 7 },
  { title: 'Dia Mundial da Saúde', icon: '🏥', rule: 'fixed', month: 4, day: 7 },
  { title: 'Dia Nacional do Livro Infantil', icon: '📚', rule: 'fixed', month: 4, day: 18 },
  { title: 'Dia Nacional do Amigo', icon: '🤝', rule: 'fixed', month: 4, day: 18 },
  { title: 'Dia do Exército Brasileiro', icon: '🪖', rule: 'fixed', month: 4, day: 19 },
  { title: 'Dia de Santo Expedito', icon: '🙏', rule: 'fixed', month: 4, day: 19 },
  { title: 'Tiradentes', icon: '🇧🇷', rule: 'fixed', month: 4, day: 21 },
  { title: 'Dia da Terra', icon: '🌍', rule: 'fixed', month: 4, day: 22 },
  { title: 'Descobrimento do Brasil', icon: '🇧🇷', rule: 'fixed', month: 4, day: 22 },
  { title: 'Dia de São Jorge', icon: '🐉', rule: 'fixed', month: 4, day: 23 },
  { title: 'Dia Mundial do Livro', icon: '📖', rule: 'fixed', month: 4, day: 23 },
  {
    title: 'Dia Mundial da Segurança e Saúde no Trabalho',
    icon: '👷',
    rule: 'fixed',
    month: 4,
    day: 28,
  },

  // ——— Maio ———
  { title: 'Dia do Trabalho', icon: '👷', rule: 'fixed', month: 5, day: 1 },
  {
    title: 'Dia Mundial da Liberdade de Imprensa',
    icon: '🌍',
    rule: 'fixed',
    month: 5,
    day: 3,
  },
  {
    title: 'Dia das Mães',
    icon: '👩‍👧',
    badge: 'Mais buscado',
    rule: 'nth_weekday',
    month: 5,
    weekday: 0,
    nth: 2,
  },
  { title: 'Dia Internacional dos Museus', icon: '📚', rule: 'fixed', month: 5, day: 18 },
  { title: 'Dia Mundial das Abelhas', icon: '🐝', rule: 'fixed', month: 5, day: 20 },
  {
    title: 'Dia Internacional da Biodiversidade',
    icon: '🌱',
    rule: 'fixed',
    month: 5,
    day: 22,
  },
  { title: 'Dia do Profissional Liberal', icon: '🧑‍🎨', rule: 'fixed', month: 5, day: 27 },

  // ——— Junho ———
  { title: 'Dia Mundial dos Pais', icon: '👶', rule: 'fixed', month: 6, day: 1 },
  { title: 'Dia Mundial do Meio Ambiente', icon: '🌳', rule: 'fixed', month: 6, day: 5 },
  {
    title: 'Dia dos Namorados',
    icon: '❤️',
    badge: 'Mais buscado',
    rule: 'fixed',
    month: 6,
    day: 12,
  },
  { title: 'Dia de Santo Antônio', icon: '⛪', rule: 'fixed', month: 6, day: 13 },
  { title: 'Dia do Lavrador', icon: '🌾', rule: 'fixed', month: 6, day: 23 },
  { title: 'Dia de São João', icon: '🔥', rule: 'fixed', month: 6, day: 24 },
  { title: 'Festa Junina', icon: '🎉', rule: 'month_span', month: 6 },
  { title: 'Dia Mundial das Redes Sociais', icon: '🎨', rule: 'fixed', month: 6, day: 30 },

  // ——— Julho ———
  { title: 'Dia Mundial da Arquitetura', icon: '🧑‍💻', rule: 'fixed', month: 7, day: 1 },
  { title: 'Dia do Bombeiro Brasileiro', icon: '🇧🇷', rule: 'fixed', month: 7, day: 2 },
  { title: 'Dia do Motorista', icon: '🚗', rule: 'fixed', month: 7, day: 25 },
  { title: 'Dia dos Avós', icon: '👨‍👩‍👧', rule: 'fixed', month: 7, day: 26 },
  {
    title: 'Dia Mundial contra o Tráfico de Pessoas',
    icon: '📰',
    rule: 'fixed',
    month: 7,
    day: 30,
  },

  // ——— Agosto ———
  { title: 'Dia do Padre', icon: '⛪', rule: 'fixed', month: 8, day: 4 },
  { title: 'Dia Nacional da Saúde', icon: '👨‍⚕️', rule: 'fixed', month: 8, day: 5 },
  {
    title: 'Dia dos Pais',
    icon: '👨‍👧‍👦',
    badge: 'Mais buscado',
    rule: 'nth_weekday',
    month: 8,
    weekday: 0,
    nth: 2,
  },
  { title: 'Dia do Estudante', icon: '🧑‍🎓', rule: 'fixed', month: 8, day: 11 },
  { title: 'Dia do Advogado', icon: '👨‍🏫', rule: 'fixed', month: 8, day: 11 },
  { title: 'Dia Mundial da Fotografia', icon: '📷', rule: 'fixed', month: 8, day: 19 },
  { title: 'Dia do Psicólogo', icon: '🧠', rule: 'fixed', month: 8, day: 27 },
  { title: 'Dia do Corretor de Imóveis', icon: '🏠', rule: 'fixed', month: 8, day: 27 },
  { title: 'Dia do Nutricionista', icon: '🥗', rule: 'fixed', month: 8, day: 31 },

  // ——— Setembro ———
  { title: 'Setembro Amarelo', icon: '💛', badge: 'Em alta', rule: 'month_span', month: 9 },
  { title: 'Setembro Verde', icon: '💚', rule: 'month_span', month: 9 },
  { title: 'Independência do Brasil', icon: '🇧🇷', rule: 'fixed', month: 9, day: 7 },
  { title: 'Dia Mundial da Alfabetização', icon: '📚', rule: 'fixed', month: 9, day: 8 },
  { title: 'Dia do Administrador', icon: '🧑‍💼', rule: 'fixed', month: 9, day: 9 },
  { title: 'Dia do Médico Veterinário', icon: '🧑‍⚕️', rule: 'fixed', month: 9, day: 9 },
  {
    title: 'Dia Mundial de Prevenção ao Suicídio',
    icon: '🎗️',
    rule: 'fixed',
    month: 9,
    day: 10,
  },
  { title: 'Dia do Programador', icon: '👨‍💻', rule: 'fixed', month: 9, day: 13 },
  { title: 'Dia do Cliente', icon: '👨‍💻', badge: 'Vale conferir', rule: 'fixed', month: 9, day: 15 },
  { title: 'Dia da Árvore', icon: '🌳', rule: 'fixed', month: 9, day: 21 },
  { title: 'Início da Primavera', icon: '🌸', rule: 'fixed', month: 9, day: 22 },
  { title: 'Dia Nacional do Idoso', icon: '👵', rule: 'fixed', month: 9, day: 27 },

  // ——— Outubro ———
  { title: 'Outubro Rosa', icon: '🎀', badge: 'Em alta', rule: 'month_span', month: 10 },
  { title: 'Dia Mundial dos Animais', icon: '🐾', rule: 'fixed', month: 10, day: 4 },
  { title: 'Dia da Micro e Pequena Empresa', icon: '📷', rule: 'fixed', month: 10, day: 5 },
  {
    title: 'Dia das Crianças',
    icon: '👶',
    badge: 'Mais buscado',
    rule: 'fixed',
    month: 10,
    day: 12,
  },
  { title: 'Nossa Senhora Aparecida', icon: '⛪', rule: 'fixed', month: 10, day: 12 },
  { title: 'Dia dos Professores', icon: '👨‍🏫', rule: 'fixed', month: 10, day: 15 },
  { title: 'Dia do Médico', icon: '🩺', rule: 'fixed', month: 10, day: 18 },
  { title: 'Dia do Profissional de TI', icon: '🧑‍💻', rule: 'fixed', month: 10, day: 19 },
  { title: 'Halloween', icon: '🎃', rule: 'fixed', month: 10, day: 31 },

  // ——— Novembro ———
  { title: 'Novembro Azul', icon: '💙', badge: 'Em alta', rule: 'month_span', month: 11 },
  { title: 'Black November', icon: '🛒', badge: 'Em alta', rule: 'month_span', month: 11 },
  { title: 'Finados', icon: '🕯️', rule: 'fixed', month: 11, day: 2 },
  { title: 'Proclamação da República', icon: '🇧🇷', rule: 'fixed', month: 11, day: 15 },
  { title: 'Dia Internacional do Homem', icon: '👨‍💻', rule: 'fixed', month: 11, day: 19 },
  { title: 'Dia da Consciência Negra', icon: '✊', rule: 'fixed', month: 11, day: 20 },
  {
    title: 'Black Friday',
    icon: '🛍️',
    badge: 'Mais buscado',
    rule: 'nth_weekday',
    month: 11,
    weekday: 5,
    nth: 4,
  },
  { title: 'Dia do Evangélico', icon: '⛪', rule: 'fixed', month: 11, day: 30 },

  // ——— Dezembro ———
  {
    title: 'Dia Internacional para a Abolição da Escravatura',
    icon: '✝️',
    rule: 'fixed',
    month: 12,
    day: 2,
  },
  {
    title: 'Dia Internacional da Pessoa com Deficiência',
    icon: '♿',
    rule: 'fixed',
    month: 12,
    day: 3,
  },
  { title: 'Dia Mundial da Propaganda', icon: '🖥️', rule: 'fixed', month: 12, day: 4 },
  { title: 'Imaculada Conceição', icon: '⛪', rule: 'fixed', month: 12, day: 8 },
  { title: 'Dia do Fonoaudiólogo', icon: '🗣️', rule: 'fixed', month: 12, day: 9 },
  { title: 'Dia dos Direitos Humanos', icon: '📢', rule: 'fixed', month: 12, day: 10 },
  { title: 'Natal', icon: '🎄', badge: 'Mais buscado', rule: 'fixed', month: 12, day: 25 },
  {
    title: 'Véspera de Ano Novo',
    icon: '🎆',
    badge: 'Em alta',
    rule: 'fixed',
    month: 12,
    day: 31,
  },
];

module.exports = {
  MARKETING_CALENDAR_CATALOG,
};
