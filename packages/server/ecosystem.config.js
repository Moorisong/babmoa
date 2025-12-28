module.exports = {
    apps: [
        {
            name: "babmoa",
            script: "src/index.js",
            env_file: ".env",
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
