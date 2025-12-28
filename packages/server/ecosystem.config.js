module.exports = {
    apps: [
        {
            name: "babmoa",
            script: "src/index.js",
            cwd: "/home/ksh/babmoa/packages/server",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
