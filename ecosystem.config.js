module.exports = {
  apps: [{
    name: 'eco-packaging-backend',
    script: 'server.js',
    args: '--env PORT=4001',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production'
    },
    merge_logs: true,
    time: true,
    autorestart: true,
    watch: false
  }]
};
