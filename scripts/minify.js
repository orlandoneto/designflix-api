const glob = require("glob");
const { exec } = require("child_process");
const path = require("path");

const files = glob.sync("dist/**/*.js");
if (!files.length) {
  console.error("No files found to minify.");
  process.exit(1);
}

files.forEach((file) => {
  const outputFile = path.join(path.dirname(file), path.basename(file));
  const terserCommand = `npx terser ${file} --compress --mangle --output ${outputFile}`;
  exec(terserCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error minifying ${file}: ${err.message}`);
      return;
    }
    if (stderr) {
      console.error(`Terser stderr for ${file}: ${stderr}`);
    }
    console.log(`Minified: ${file}`);
  });
});
