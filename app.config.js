// Expo passes the resolved app.json as config. Defaults retain its exact behavior.
const { configureApp } = require('./config/pinning-lab.cjs');

module.exports = ({ config }) => configureApp(config);
