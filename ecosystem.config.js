module.exports = {
    apps: [
        {
            name: 'ducheck',
            script: './index.js',
            // Use fork mode for single polling process (avoids cluster overhead)
            exec_mode: 'fork',
            instances: 1,
            // Ensures that if the script crashes, PM2 automatically restarts it
            autorestart: true,
            // If the script crashes too fast, PM2 will stop restarting it (reduces CPU loops)
            max_restarts: 10,
            // Automatically restart if process RSS memory exceeds 150MB (Node 22 baseline RSS is ~80MB)
            max_memory_restart: '150M',
            // Limit Node V8 max heap to 64MB to trigger aggressive garbage collection
            node_args: '--max-old-space-size=64',
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
