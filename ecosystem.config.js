module.exports = {
    apps: [
        {
            name: 'ducheck',
            script: './index.js',
            // Useful for PM2's cluster mode to specify instances, but 1 is fine for a polling script
            instances: 1,
            // Ensures that if the script crashes, PM2 automatically restarts it
            autorestart: true,
            // If the script crashes too fast, PM2 will stop restarting it (reduces CPU loops)
            max_restarts: 10,
            // Give time for the script to close connections on stop
            kill_timeout: 3000,
            // Log files
            error_file: './logs/ducheck-error.log',
            out_file: './logs/ducheck-out.log',
            // Add timestamp to logs (useful for PM2 logs without custom formatting in the script)
            time: true,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            }
        }
    ]
};
