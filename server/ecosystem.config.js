module.exports = {
  apps: [
    {
      name: 'resolve-rag-server',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
