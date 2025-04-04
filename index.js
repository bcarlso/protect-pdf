#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const qpdf = require("node-qpdf");
const { spawnSync } = require("child_process");

function encryptWithGhostscript(input, output, pin) {
  // Ghostscript PDF encryption parameters (basic example):
  //
  //   -sOwnerPassword=...
  //   -sUserPassword=...
  //   -dEncryptionR=4 => up to AES-128
  //   -dKeyLength=128
  //   -dPermissions=-4 => e.g. allow printing only
  //   ...
  //
  // Adjust these as needed. Ghostscript has quite a few parameters.

  const gsArgs = [
    "-sDEVICE=pdfwrite",
    `-sOwnerPassword=${pin}`,
    `-sUserPassword=${pin}`,
    "-dEncryptionR=4",
    "-dKeyLength=128",
    "-dPermissions=-4",
    "-o", output,
    input
  ];
console.log(gsArgs);
  const result = spawnSync("gs", gsArgs, { encoding: "utf8" });
  if (result.error) {
    console.error("Error running Ghostscript:", result.error);
  } else {
    console.log("Ghostscript stdout:", result.stdout);
    console.error("Ghostscript stderr:", result.stderr);
  }
}

// Simple helper to parse command-line arguments.
// Usage: node index.js <directory> <pin> [--dry-run]
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: protect-pdf <directory> <pin> [--dry-run]");
    process.exit(1);
  }

  const directory = args[0];
  const pin = args[1];
  const dryRun = args.includes("--dry-run");

  return { directory, pin, dryRun };
}

// Check if a file is a PDF by extension
function isPdfFile(filePath) {
  return path.extname(filePath).toLowerCase() === ".pdf";
}

// Secure (encrypt) a PDF with a PIN.
// `outFile` can be the same as `inFile` if you're overwriting in place.
async function securePdf(inFile, outFile, pin) {
  console.log(`Updating '${outFile}' with password '${pin}'...`)
  try {
    await qpdf.encrypt({
      input: inFile,
      output: outFile,
      password: "1234",      // User password
      // Optionally, you can also set an 'ownerPassword'.
      // By default, password is set for both user and owner if you only specify 'password'.
      options: {
        keyLength: 256,   // AES 256 bit encryption
      },
    });
    console.log(`Protected: ${outFile}`);
  } catch (err) {
    console.error(`Failed to protect: ${inFile}\nError: ${err}`);
  }
}

// Recursively traverse a directory to find PDF files.
function getAllFiles(dir) {
  const filesAndDirs = fs.readdirSync(dir, { withFileTypes: true });
  let filePaths = [];

  for (const entry of filesAndDirs) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      filePaths = filePaths.concat(getAllFiles(fullPath));
    } else {
      filePaths.push(fullPath);
    }
  }
  return filePaths;
}

async function secureCopyOfPdf(filePath, pin) {
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const outFile = path.join(dirName, `protected-${baseName}`);
  await encryptWithGhostscript(filePath, outFile, pin);
}

async function main() {
  const { directory, pin, dryRun } = parseArgs();

  // Get all files (recursively) in the directory
  const files = getAllFiles(directory);

  for (const file of files) {
    if (isPdfFile(file)) {
      if (dryRun) {
        await secureCopyOfPdf(file, pin);
      } else {
        const tempFile = `${file}.temp.pdf`;
        await encryptWithGhostscript(file, tempFile, pin);
        // Replace original
        fs.unlinkSync(file);
        fs.renameSync(tempFile, file);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
