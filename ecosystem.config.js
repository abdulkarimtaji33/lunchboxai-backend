module.exports = {
  apps: [{
    name: 'lunchboxai-api',
    script: 'server.js',
    cwd: '/var/www/lunchboxai',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
  }],
};
