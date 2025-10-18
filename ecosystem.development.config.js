module.exports = {
  apps: [
    {
      name: "designflix-api-dev", // Nome da sua aplicação
      cwd: "/root/api/dev/designflix-api/current",
      script: "src/main.js", // Arquivo principal da aplicação
      instances: 2, // Executar 2 instâncias em desenvolvimento
      exec_mode: "cluster", // Modo de execução "cluster" (habilita múltiplos workers)
      autorestart: true, // Reinicia automaticamente em caso de falha
      watch: true, // Habilita watch apenas em desenvolvimento
      ignore_watch: [
        // Ignora alterações nestes diretórios
        "node_modules",
        "logs",
        ".git",
      ],
      max_memory_restart: "800M", // Limite de memória mais baixo para dev
      env: {
        NODE_ENV: "development", // Ambiente de desenvolvimento
        DOTENV_CONFIG_PATH: "/root/api/dev/designflix-api/current/.env",
        PORT: 3000, // Porta da aplicação em desenvolvimento
        DISABLE_REDIS_DEV: "true", // Desabilita Redis em desenvolvimento
      },
      error_file: "/root/api/dev/designflix-api/shared/logs/error.log",
      out_file: "/root/api/dev/designflix-api/shared/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
    },
  ],

  deploy: {
    staging: {
      user: "root", // Usuário SSH no servidor
      host: "46.202.146.92", // IP ou Host do servidor
      ref: "origin/main", // Branch do repositório Git que será usada
      repo: "git@github.com:orlandoneto/designflix-api.git", // Repositório Git
      path: "/root/api/dev/designflix-api", // Caminho onde o projeto será implantado
      "post-deploy":
        "cd /root/api/dev/designflix-api/current && npm ci --no-audit --no-fund --unsafe-perm || npm install --no-audit --no-fund --unsafe-perm && pm2 reload ecosystem.development.config.js --only designflix-api-dev && pm2 save --force && pm2 list",
      // "pre-deploy-local": "echo 'Preparando deploy of development...'", // Opcional
    },
  },
};
