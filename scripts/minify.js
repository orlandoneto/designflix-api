const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

// Diretório de saída dos arquivos compilados
const distDir = path.resolve(__dirname, '../dist');

// Verifica se o diretório dist existe
if (!fs.existsSync(distDir)) {
  console.error("Diretório 'dist' não encontrado. Certifique-se de que a aplicação foi compilada.");
  process.exit(1);
}

// Função para minificar os arquivos
const minifyFiles = (dir) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);

    if (fs.statSync(filePath).isDirectory()) {
      // Se for uma subpasta, chama a função recursivamente
      minifyFiles(filePath);
    } else if (file.endsWith('.js')) {
      // Apenas arquivos .js
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      const result = UglifyJS.minify(fileContents);

      if (result.error) {
        console.error(`Erro ao minificar ${file}:`, result.error);
        return;
      }

      fs.writeFileSync(filePath, result.code, 'utf-8');
      console.log(`Minificado: ${filePath}`);
    }
  });
};

// Minifica os arquivos na pasta dist
minifyFiles(distDir);
console.log("Minificação concluída.");
