// PM2 ecosystem — запускает Next.js production-сервер на VPS.
// Использование:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 save            # сохранить в автозагрузку
//   pm2 startup         # создать systemd-юнит (выполнить один раз)
module.exports = {
  apps: [
    {
      name: "2x2-shop",
      cwd: "/var/www/2x2-shop",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "600M",
      node_args: "--max-old-space-size=512",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      // Переменные из .env.production подхватываются Next.js автоматически.
      // Секреты (SUPABASE_SERVICE_ROLE_KEY, CDEK_*) должны лежать в /var/www/2x2-shop/.env.production
      // с правами 600 и владельцем deploy:deploy.
      out_file: "/var/log/2x2-shop/out.log",
      error_file: "/var/log/2x2-shop/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: false,
    },
  ],
};
