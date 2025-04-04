const { spawnSync } = require("child_process");
const x = require('../index');

test('', () => {
    args = ["../index.js", "./test/assets", "1234", "--dry-run"];


    const result = spawnSync("node", args, { stdio: "inherit" });
});