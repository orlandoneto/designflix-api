module.exports = {
  apps: [
    {
      name: "designflix-api", // Nome da sua aplicação
      script: "./src/main.js", // Arquivo principal da aplicação
      instances: "max", // Usa o máximo de instâncias de CPU disponíveis
      exec_mode: "cluster", // Modo de execução em cluster
      watch: false, // Desabilita o watch em produção para evitar reinicializações desnecessárias
      env: {
        NODE_ENV: "development", // Ambiente de desenvolvimento
        PORT: 3000, // Porta da aplicação
      },
      env_production: {
        NODE_ENV: "production", // Ambiente de produção
        PORT: 4000, // Porta em produção
      },
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
        "npm install && npm run build && pm2 reload ecosystem.config.js --env production", // Comandos pós-deploy
    },
    staging: {
      user: "root",
      host: "46.202.146.92",
      ref: "origin/main",
      repo: "git@github.com:orlandoneto/designflix-api.git",
      path: "/root/api/dev/designflix-api",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env development", // Comandos pós-deploy
    },
  },
};
