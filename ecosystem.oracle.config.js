/**
 * PM2 — Oracle Always Free A1.Flex (2 OCPU / 12 GB)
 * 2 workers em cluster; crons só no worker 0 (cron-leader.js).
 */
module.exports = {
  apps: [
    {
      name: "designflix-api",
      cwd: "/home/opc/designflix-api",
      script: "src/main.js",
      instances: 2,
      exec_mode: "cluster",
      watch: false,
      autorestart: true,
      max_memory_restart: "1G",
      min_uptime: "30s",
      listen_timeout: 8000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        DOTENV_CONFIG_PATH: "/home/opc/designflix-api/.env",
        PORT: 4000,
      },
      error_file: "/home/opc/designflix-api/logs/error.log",
      out_file: "/home/opc/designflix-api/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
      merge_logs: true,
    },
  ],
};
