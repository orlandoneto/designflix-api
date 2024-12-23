module.exports = {
  apps: [
    {
      name: "designflix-api-prd", // Nome da sua aplicação
      script: "/root/api/prd/designflix-api/source/src/main.js", // Arquivo principal da aplicação
      instances: 1, // Garantindo que apenas uma instância será executada
      exec_mode: "fork", // Modo de execução "fork" (não cluster)
      watch: false, // Desabilita o watch em produção para evitar reinicializações desnecessárias
      env: {
        NODE_ENV: "production", // Ambiente de produção
        DOTENV_CONFIG_PATH: "/root/api/prd/designflix-api/source/.env",
        PORT: 4000, // Porta da aplicação em produção
      },
      error_file: "/root/api/prd/designflix-api/shared/logs/error.log",
      out_file: "/root/api/prd/designflix-api/shared/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
    },
  ],

  deploy: {
    production: {
      user: "root", // Usuário SSH no servidor
      host: "46.202.146.92", // IP ou Host do servidor
      ref: "origin/main", // Branch do repositório Git que será usada
      repo: "git@github.com:orlandoneto/designflix-api.git", // Repositório Git
      path: "/root/api/prd/designflix-api", // Caminho onde o projeto será implantado
      "post-deploy":
        "npm i && npx sequelize db:seed:undo:all --env production && npx sequelize db:seed:all --env production && pm2 reload ecosystem.production.config.js --only designflix-api-prd && pm2 save --force && pm2 list && rm -rf .eslintrc.json .vscode README.md babel.config.js scripts ecosystem.development.config.js ecosystem.production.config.js seeders migrations model",
      "pre-deploy-local": "echo 'Preparando deploy of production...'", // Opcional
    },
  },
};
