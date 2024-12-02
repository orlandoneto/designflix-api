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
      error_file: "../shared/logs/error.log", // Arquivo de erro (compartilhado)
      out_file: "../shared/logs/out.log", // Arquivo de saída (compartilhado)
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],

  deploy: {
    production: {
      user: "root", // Usuário SSH no servidor
      host: "46.202.146.92", // IP ou Host do servidor
      ref: "origin/main", // Branch do repositório Git que será usada
      repo: "https://github.com/orlandoneto/designflix-api.git", // Repositório Git
      path: "/root/api/prd/designflix-api", // Caminho onde o projeto será implantado
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-deploy-local": "echo 'Preparando deploy of production...'", // Opcional
    },
    staging: {
      user: "root",
      host: "46.202.146.92",
      ref: "origin/main",
      repo: "https://github.com/orlandoneto/designflix-api.git",
      path: "/root/api/dev/designflix-api",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env development",
      "pre-deploy-local": "echo 'Preparando deploy of development...'", // Opcional
    },
  },
};
