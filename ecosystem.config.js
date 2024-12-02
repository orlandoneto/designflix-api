module.exports = {
  apps: [
    {
      name: "designflix-api", // Nome da sua aplicação
      script: "./src/main.js", // Arquivo principal da aplicação
      instances: 1, // Uma única instância (não cluster)
      exec_mode: "fork", // Modo de execução "fork" (não cluster)
      watch: false, // Desabilita o watch em produção para evitar reinicializações desnecessárias
      env: {
        NODE_ENV: "development", // Ambiente de desenvolvimento
        PORT: 3000, // Porta da aplicação
      },
      env_production: {
        NODE_ENV: "production", // Ambiente de produção
        PORT: 4000, // Porta em produção
      },
      error_file: "/root/api/prd/designflix-api/shared/logs/error.log",
      out_file: "/root/api/prd/designflix-api/shared/logs/out.log",     
      log_date_format: "YYYY-MM-DD HH:mm Z",
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
        "npm install && pm2 reload ecosystem.config.js --env production", // Comando pós-deploy
      "pre-deploy-local": "echo 'Preparando deploy of production...'", // Opcional
    },
    staging: {
      user: "root", // Usuário SSH no servidor
      host: "46.202.146.92", // IP ou Host do servidor
      ref: "origin/main", // Branch do repositório Git que será usada
      repo: "git@github.com:orlandoneto/designflix-api.git", // Repositório Git
      path: "/root/api/dev/designflix-api", // Caminho onde o projeto será implantado
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env development", // Comando pós-deploy
      "pre-deploy-local": "echo 'Preparando deploy of development...'", // Opcional
    },
  },
};
