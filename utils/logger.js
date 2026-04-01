"use strict";

const chalk = require("chalk");

// Log hanya tampil di terminal, tidak ditulis ke file
const logger = {
  info: (...args) => console.log(chalk.cyan("[INFO]"), ...args),
  success: (...args) => console.log(chalk.green("[OK]"), ...args),
  warn: (...args) => console.log(chalk.yellow("[WARN]"), ...args),
  error: (...args) => console.log(chalk.red("[ERROR]"), ...args),
  command: (user, cmd) =>
    console.log(
      chalk.magenta("[CMD]"),
      chalk.white(user),
      "→",
      chalk.yellow(cmd),
    ),
};

module.exports = logger;
