module.exports = {
    apps: [
        {
            name: "babmoa",
            script: "/home/ksh/babmoa/packages/server/src/index.js",
            env_file: "/home/ksh/babmoa/packages/server/.env",
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
