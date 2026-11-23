import fs from 'node:fs';
import path from 'node:path';
import { runProjectAudit } from '../server/projectAuditService.ts';
import { buildProjectFinalPdf } from '../server/pdfProjectReport.ts';

const audit = runProjectAudit();
const { pdfBuffer, pageCount } = buildProjectFinalPdf(audit);

const rootFinalPath = path.resolve(process.cwd(), 'LearnMatch_Relatorio_Final_Projeto.pdf');
const rootDocsPath = path.resolve(process.cwd(), 'LearnMatch_Documentacao_Tecnica.pdf');
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicDocsPath = path.join(publicDir, 'LearnMatch_Documentacao_Tecnica.pdf');
const publicFinalPath = path.join(publicDir, 'LearnMatch_Relatorio_Final_Projeto.pdf');

fs.writeFileSync(rootFinalPath, pdfBuffer);
fs.writeFileSync(rootDocsPath, pdfBuffer);
fs.writeFileSync(publicDocsPath, pdfBuffer);
fs.writeFileSync(publicFinalPath, pdfBuffer);

console.log(
  `Relatorio Final PDF (15 capitulos, ${pageCount} paginas, ${pdfBuffer.length} bytes) gerado com sucesso em:`,
);
console.log(`- ${rootFinalPath}`);
console.log(`- ${publicFinalPath}`);
console.log(`- ${rootDocsPath}`);
console.log(`- ${publicDocsPath}`);
