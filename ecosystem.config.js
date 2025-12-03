module.exports = {
  apps: [
    {
      name: 'blog-automation',
      script: 'npm',
      args: 'start',
      cwd: '/Users/wiztheplanning/Desktop/blog_automation',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
