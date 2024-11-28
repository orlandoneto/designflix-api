module.exports = {
  apps: [
    {
      name: 'designflix-api',
      script: './src/main.js', // Caminho para o arquivo principal da API
    },
  ],
  deploy: {
    production: {
      user: 'ubuntu',            // Usuário SSH correto (não root, por padrão é 'ubuntu' em muitas VPS)
      host: '46.202.146.92',     // Endereço da VPS
      ref: 'origin/main',        // Branch do Git
      repo: 'git@github.com:orlandoneto/designflix-api.git',
      path: '/var/www/designflix-api', // Caminho no servidor remoto onde o código será implantado
      'pre-deploy-local': '',    // Comandos antes do deploy local
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production', // Comandos pós-deploy
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
