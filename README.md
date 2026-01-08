# 🤖 SCRIPT TOOLKIT - Automação Web Completa

> Suite de ferramentas para automação de downloads, extração de dados e preenchimento de formulários

Quatro ferramentas poderosas em JavaScript para automação web:

## 📂 Estrutura

```
script/
├── baixatron/                    # Auto-Downloader Standard
│   ├── baixatron.js              # Script com tema claro/escuro
│   └── README.md                 # Documentação detalhada
│
├── baixatron-hacker/             # Auto-Downloader Cyberpunk
│   ├── baixatron-hacker.js       # Script com estética neon
│   └── README.md                 # Guia da versão cyberpunk
│
├── extractron/                   # Extrator de PDFs
│   ├── extractron.html           # Interface de extração
│   └── README.md                 # Documentação técnica
│
├── formtron/                     # Automação de Formulários
│   ├── formtron.js               # Script de preenchimento
│   └── README.md                 # Guia de uso
│
└── README.md                     # Este arquivo
```

## 🎯 Ferramentas Disponíveis

### 📥 **BAIXATRON** (Auto-Downloader Standard)
**Para quem quer simplicidade e produtividade**

- ✅ Interface dark mode elegante
- ✅ Tema claro/escuro togável
- ✅ Painel minimalista e clean
- ✅ Suporta 12+ formatos de arquivo
- ✅ Detecção inteligente de downloads
- ✅ Estatísticas em tempo real
- ✅ Controle de velocidade ajustável

👉 [Ver documentação completa →](baixatron/README.md)

### 🔴 **BAIXATRON HACKER** (Auto-Downloader Cyberpunk)
**Para quem ama estética futurista**

- ✅ Design neon verde + ciano
- ✅ Animações glitch e blink
- ✅ Logger colorido no console
- ✅ Painel tipo matriz/hacker
- ✅ Sintaxe hacker nos botões
- ✅ Mesma funcionalidade, estilo diferente
- ✅ Para users que curtem cyberpunk

👉 [Ver documentação completa →](baixatron-hacker/README.md)

### 🔍 **EXTRACTRON** (Extrator de PDFs)
**Extração automática de dados de decretos municipais**

- ✅ Leitura de PDFs com texto nativo via PDF.js
- ✅ OCR automático para documentos digitalizados (Tesseract.js)
- ✅ Processamento em lote com drag-and-drop
- ✅ Extração de número, data, letra e descrição
- ✅ Exportação em JSON estruturado
- ✅ Interface web standalone (sem backend)
- ✅ Detecção automática do tipo de PDF

👉 [Ver documentação completa →](extractron/README.md)

### 🤖 **FORMTRON** (Automação de Formulários)
**Preenchimento automático de formulários web**

- ✅ Painel de controle interativo flutuante
- ✅ Leitura de dados via JSON (compatível com EXTRACTRON)
- ✅ Pausar/retomar processo a qualquer momento
- ✅ Iniciar de decreto específico (recuperação)
- ✅ Retry automático em caso de rate limiting
- ✅ Barra de progresso e estatísticas em tempo real
- ✅ Logs detalhados no console

👉 [Ver documentação completa →](formtron/README.md)

## 📊 Comparativo

| Ferramenta | Tipo | Ambiente | Propósito |
|------------|------|----------|-----------|
| **BAIXATRON** | Downloader | Console | Download automático em massa |
| **BAIXATRON HACKER** | Downloader | Console | Download com estética cyberpunk |
| **EXTRACTRON** | Extrator | Web App | Extração de dados de PDFs |
| **FORMTRON** | Automação | Console | Preenchimento de formulários |

### Detalhes por Ferramenta

| Aspecto | BAIXATRON | BAIXATRON HACKER | EXTRACTRON | FORMTRON |
|---------|-----------|------------------|------------|----------|
| **Interface** | Painel flutuante | Painel neon | HTML standalone | Painel flutuante |
| **Execução** | Console browser | Console browser | Arquivo HTML | Console browser |
| **Dependências** | Nenhuma | Nenhuma | PDF.js + Tesseract | Nenhuma |
| **Input** | Autodetecção | Autodetecção | Arquivos PDF | JSON |
| **Output** | Downloads | Downloads | JSON | Submissões web |
| **Tema** | Claro/escuro | Cyberpunk | Padrão | Dark |

## 🔄 Workflows Integrados

### Workflow 1: Download em Massa
```
Site com arquivos → BAIXATRON → Arquivos baixados
```

### Workflow 2: Extração + Automação (Completo)
```
PDFs → EXTRACTRON → JSON → FORMTRON → Sistema Web
```

**Exemplo prático:**
1. **EXTRACTRON** processa decretos em PDF
2. Gera JSON com dados estruturados
3. **FORMTRON** lê o JSON
4. Preenche formulário web automaticamente
5. Sistema recebe dados organizados

## ⚡ Quick Start

### 📥 BAIXATRON (Downloaders)

```javascript
// 1. Escolha sua versão
// OPÇÃO A: Standard → baixatron/baixatron.js
// OPÇÃO B: Hacker → baixatron-hacker/baixatron-hacker.js

// 2. Cole no console (F12)
// 3. Use os comandos:
__dl.scan()      // Encontra todos os downloads
__dl.start()     // Começa a baixar
```

### 🔍 EXTRACTRON (Extrator de PDFs)

```
1. Abra extractron/extractron.html no navegador
2. Arraste PDFs para a área indicada
3. Aguarde processamento (texto nativo ou OCR)
4. Clique em "Baixar JSON"
```

### 🤖 FORMTRON (Automação de Formulários)

```javascript
// 1. Prepare o JSON (pode vir do EXTRACTRON)
// 2. Abra a página do formulário web
// 3. Cole formtron/formtron.js no console (F12)
// 4. Script inicia automaticamente
// 5. Use o painel para controlar (pausar/retomar/parar)
```

## 🚀 Comandos por Ferramenta

### BAIXATRON / BAIXATRON HACKER

```javascript
// Escanear downloads
__dl.scan()

// Iniciar (em modo dryRun = simulação)
__dl.start()

// Parar o processo
__dl.stop()

// Resetar tudo
__dl.reset()

// Seleção
__dl.selectAll()
__dl.deselectAll()

// Ativar modo real (CUIDADO!)
__dl.setOptions({ dryRun: false })

// Mudar velocidade (padrão: 800ms)
__dl.setOptions({ delayMs: 1000 })

// Ver estado
__dl.state
```

### EXTRACTRON

```
Interface gráfica - use drag-and-drop
Sem comandos de console necessários
```

### FORMTRON

```javascript
// Controle via painel flutuante:
// - Botão Pausar/Retomar
// - Botão Parar
// - Campo "Iniciar do decreto X"

// Configuração avançada (edite no código):
const DELAY = 1000;        // Intervalo entre submissões
const RETRY_DELAY = 20000; // Tempo para retry
```

## ⚠️ IMPORTANTE: Modo Seguro

Ambas as versões começam com **`dryRun: true`**, o que significa:

✅ O script simula os cliques  
✅ Nenhum arquivo é baixado de fato  
✅ Você pode verificar se está funcionando  

Para **ativar downloads reais**:

```javascript
__dl.setOptions({ dryRun: false })
__dl.start()
```

## ✨ Funcionalidades por Ferramenta

### BAIXATRON (ambas versões)
✅ Detecção Automática - Encontra downloads em qualquer site  
✅ Painel Visual - Interface flutuante intuitiva  
✅ Seleção Customizável - Escolha quais arquivos baixar  
✅ Barra de Progresso - Acompanhe em tempo real  
✅ Modo Seguro - Começa em simulação (dryRun)  
✅ Controle via Console - API completa  
✅ Múltiplos Formatos - PDF, Word, Excel, ZIP, RAR, etc.  
✅ Detecção de Iframes - Funciona em sites complexos  
✅ Deduplicação - Remove duplicatas automaticamente  

### EXTRACTRON
✅ PDF.js v3.11.174 - Extração de texto nativo  
✅ Tesseract.js v5.0.4 - OCR para PDFs digitalizados  
✅ Processamento em Lote - Múltiplos arquivos simultaneamente  
✅ Detecção Inteligente - Identifica tipo de PDF automaticamente  
✅ Regex Otimizado - Extrai número, data, letra, descrição  
✅ Exportação JSON - Formato estruturado para integração  
✅ Interface Drag-and-Drop - Facilidade de uso  

### FORMTRON
✅ Painel de Controle - Interface flutuante com estatísticas  
✅ Pausar/Retomar - Controle total do processo  
✅ Iniciar de Decreto X - Recuperação de sessão  
✅ Retry Automático - Aguarda 20s em rate limiting  
✅ Controle de Ritmo - Intervalo configurável entre envios  
✅ Logs Detalhados - Rastreamento completo no console  
✅ Barra de Progresso - Visualização em tempo real  
✅ Compatível com EXTRACTRON - Lê JSON direto  

## 📁 Formatos e Tecnologias

### Arquivos Suportados (BAIXATRON)
- 📄 **Documentos**: PDF, DOC, DOCX, ODT, TXT
- 📊 **Planilhas**: XLS, XLSX, ODS, CSV
- 🎠 **Apresentações**: PPT, PPTX
- 📦 **Compactados**: ZIP, RAR, 7Z
- 📝 **Outros**: RTF, WPD, e mais

### Dados Extraídos (EXTRACTRON)
```json
{
  "numero": "001/2024",
  "data": "01/01/2024",
  "letra": "A",
  "descricao": "Dispõe sobre...",
  "arquivo": "decreto_001_2024.pdf"
}
```

### Tecnologias Utilizadas
- **JavaScript Vanilla** - Sem dependências externas (BAIXATRON e FORMTRON)
- **PDF.js** - Parser de PDF client-side (EXTRACTRON)
- **Tesseract.js** - OCR em JavaScript (EXTRACTRON)
- **HTML5 File API** - Manipulação de arquivos (EXTRACTRON)

## 🌍 Casos de Uso

### BAIXATRON - Download em Massa
```javascript
// Prefeituras com portais de decretos/leis
__dl.scan()           // Encontra todos os PDFs
__dl.selectAll()      // Seleciona todos
__dl.setOptions({ dryRun: false, delayMs: 800 })
__dl.start()          // Começa a baixar
```

**Sites compatíveis:**
- Scriptcase (prefeituras brasileiras)
- WordPress com WPDM
- Elementor / Sites genéricos

### EXTRACTRON - Extração de Decretos
```
1. Baixe PDFs com BAIXATRON
2. Arraste para EXTRACTRON
3. Aguarde processamento
4. Baixe JSON estruturado
```

**Ideal para:**
- Decretos municipais digitalizados
- Documentos escaneados sem OCR prévio
- Leis e portarias em PDF

### FORMTRON - Preenchimento Automático
```javascript
// Usa JSON do EXTRACTRON
// Preenche formulários web automaticamente
// Controle via painel flutuante
```

**Ideal para:**
- Importação em sistemas de gestão pública
- Cadastro em lote de documentos
- Migração de dados entre sistemas

### Workflow Completo (EXTRACTRON + FORMTRON)
```
1. PDFs de decretos municipais (fonte)
2. EXTRACTRON processa e gera JSON
3. FORMTRON lê JSON
4. Sistema web recebe dados organizados
```

## 🎨 Design & Estética

### BAIXATRON Standard
- **Paleta**: Preto (#1a1a1a) + Branco (#ffffff)
- **Acentos**: Verde (#4CAF50), Laranja (#ff9800), Vermelho (#dc3545)
- **Fontes**: System fonts (-apple-system, Segoe UI)
- **Animações**: Transições suaves (0.3s)
- **Tema**: Toggle claro/escuro

### BAIXATRON Hacker
- **Paleta**: Azul escuro (#0a0e27) + Verde neon (#00ff41) + Ciano (#00ffff)
- **Fontes**: Courier New (monospace)
- **Animações**: Glitch (3s), Blink (1s), SlideIn com blur
- **Efeito**: Neon shadows (0 0 20px rgba)
- **Tema**: Cyberpunk fixo

### EXTRACTRON
- **Interface**: HTML5 moderna com drag-and-drop
- **Feedback**: Progress bars e status visual
- **Cores**: Esquema neutro profissional

### FORMTRON
- **Painel**: Flutuante dark mode
- **Ícone**: 🤖 robô (identidade visual)
- **Controles**: Botões com feedback visual
- **Barra**: Progresso animada em tempo real

## 🔧 Compatibilidade

| Navegador | BAIXATRON | EXTRACTRON | FORMTRON |
|-----------|-----------|------------|----------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ | ✅ | ⚠️ Limitado |
| Edge 90+ | ✅ | ✅ | ✅ |
| Opera | ✅ | ✅ | ✅ |

⚠️ **Safari**: FORMTRON pode ter limitações com fetch de arquivos locais (política CORS)

### Requisitos Técnicos
- **BAIXATRON**: Console JavaScript habilitado
- **EXTRACTRON**: HTML5 File API, Workers (para OCR)
- **FORMTRON**: Console JavaScript, fetch API, JSON local ou via URL

## 🛡️ Segurança

✅ **Sem dependências npm** - Código standalone  
✅ **100% código vanilla JavaScript** - BAIXATRON e FORMTRON  
✅ **Bibliotecas via CDN confiável** - EXTRACTRON (PDF.js + Tesseract)  
✅ **Roda localmente** - Processamento no navegador  
✅ **Nenhum servidor externo** - Sem envio de dados  
✅ **Código auditável** - Todo código visível e modificável  
✅ **Sem armazenamento** - Não guarda credenciais ou dados  
✅ **Filtro anti-acidental** - BAIXATRON inicia em modo seguro  
✅ **Deduplicação** - Evita downloads/submissões duplicadas  

### Privacidade
- BAIXATRON: Apenas simula cliques em links já visíveis
- EXTRACTRON: Processa PDFs localmente, sem upload
- FORMTRON: Preenche formulários sem armazenar dados
- Nenhuma ferramenta envia informações para servidores externos

## 🐛 Troubleshooting

### BAIXATRON
**"Nenhum arquivo encontrado"**
- Certifique-se que está na página correta
- Tente atualizar a página (F5)
- Verifique se há links de download visíveis

**"Downloads não iniciam"**
- Verifique se `dryRun` está `false`
- Certifique-se que tem arquivos selecionados
- Veja os logs no console (F12)

### EXTRACTRON
**"OCR muito lento"**
- Normal para PDFs digitalizados (5-15s/página)
- Processe menos arquivos por vez
- Use PDFs com texto nativo quando possível

**"Extração incorreta"**
- Verifique qualidade da digitalização
- PDFs com layout não-padrão precisam ajuste manual
- Teste com arquivo individual primeiro

### FORMTRON
**"Rate limiting / Erro 429"**
- Script aguarda 20s automaticamente
- Aumente DELAY se persistir
- Verifique limites do servidor

**"Formulário não preenche"**
- Ajuste seletores CSS no código
- Verifique console para erros
- Teste em modo manual primeiro

**"JSON não carrega"**
- Verifique caminho do arquivo
- Use JSON válido (teste em jsonlint.com)
- Veja erros de CORS no console

## 📚 Documentação Completa

- **[BAIXATRON Standard](baixatron/README.md)** - Download automático com tema toggle
- **[BAIXATRON Hacker](baixatron-hacker/README.md)** - Versão cyberpunk com efeitos neon
- **[EXTRACTRON](extractron/README.md)** - Extração de PDFs com OCR
- **[FORMTRON](formtron/README.md)** - Automação de formulários web

## 💡 Dicas de Uso

### BAIXATRON
1. **Teste primeiro em modo seguro** - Sempre comece com `dryRun: true`
2. **Deselecione itens indesejados** - Use a UI para marcar/desmarcar
3. **Ajuste a velocidade** - Se tiver muitos arquivos, aumente o delay
4. **Monitore o console** - Veja o que o script está fazendo
5. **Pause se necessário** - Use `__dl.stop()` para pausar

### EXTRACTRON
1. **Teste com 1-2 PDFs primeiro** - Valide extração antes de processar lote
2. **Separe PDFs nativos de digitalizados** - OCR demora mais
3. **Verifique qualidade** - Digitalizações ruins afetam precisão
4. **Processe em lotes** - 10-20 arquivos por vez para melhor performance
5. **Valide JSON exportado** - Sempre confira dados antes de usar

### FORMTRON
1. **Configure seletores corretos** - Adapte ao formulário específico
2. **Teste com 1-2 itens** - Valide preenchimento antes de rodar tudo
3. **Monitore rate limiting** - Script trata automaticamente
4. **Use "Iniciar do X"** - Retome de onde parou em caso de interrupção
5. **Acompanhe logs** - Console mostra cada operação em detalhe

### Workflow Integrado
1. **BAIXATRON → PDFs locais** - Download em massa
2. **EXTRACTRON → JSON estruturado** - Extração automática
3. **FORMTRON → Sistema preenchido** - Automação completa
4. **Valide cada etapa** - Não pule verificações intermediárias

## 📊 Exemplos de Uso Completo

### Caso 1: Download + Extração
```javascript
// PASSO 1: Baixar decretos com BAIXATRON
__dl.scan()
__dl.setOptions({ dryRun: false })
__dl.start()

// PASSO 2: Após downloads, abrir EXTRACTRON
// extractron/extractron.html
// Arrastar PDFs baixados
// Exportar JSON
```

### Caso 2: Extração + Automação (Workflow Completo)
```javascript
// PASSO 1: EXTRACTRON
// Processar PDFs → Gerar decretos.json

// PASSO 2: FORMTRON
// Abrir página do formulário
// Colar formtron.js no console
// Script lê decretos.json automaticamente
// Usar painel para controlar processo
```

### Caso 3: Download Seletivo
```javascript
// Baixar apenas alguns arquivos específicos
__dl.scan()
// Deselecionar manualmente via interface
__dl.setOptions({ dryRun: false, delayMs: 1000 })
__dl.start()
```

### Caso 4: Recuperação de Processo
```javascript
// FORMTRON - Continuar de onde parou
// 1. Script iniciou automaticamente
// 2. Pausou no decreto 50
// 3. Digitar "50" no campo "Iniciar do decreto"
// 4. Clicar Retomar
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação específica da ferramenta
2. Verifique os logs do console (F12 → Console)
3. Teste com modo seguro/simulação primeiro
4. Revise exemplos de uso na documentação

### Recursos Úteis
- **BAIXATRON**: Veja `__dl.state` no console para debug
- **EXTRACTRON**: Teste com 1 PDF antes de processar lote
- **FORMTRON**: Monitore painel flutuante e logs do console
- **Workflow**: Valide JSON entre EXTRACTRON e FORMTRON

## 🎁 Recursos Inclusos

Todas as ferramentas incluem:

**BAIXATRON / BAIXATRON HACKER**
- Console Logger com status e erros
- Painel Flutuante interativo
- Estatísticas em tempo real
- Controle de velocidade
- API completa via `__dl`

**EXTRACTRON**
- Interface drag-and-drop
- Progress bar por arquivo
- Visualização de resultados
- Exportação JSON com um clique
- Suporte a múltiplos arquivos

**FORMTRON**
- Painel de controle flutuante
- Barra de progresso animada
- Estatísticas de sucesso/falha
- Logs coloridos no console
- Controles pause/resume/stop

## 📄 Licença

MIT - Use livremente, em qualquer projeto! 

## 🙏 Agradecimentos

Suite desenvolvida para facilitar automação em processos de gestão pública brasileira:
- Download em massa de documentos oficiais
- Extração de dados de decretos e leis
- Importação automatizada em sistemas web

---

**Escolha suas ferramentas e comece a automatizar agora!** 🚀

| Ferramenta | Descrição | Ambiente |
|------------|-----------|----------|
| 📥 **BAIXATRON** | Download automático clean & produtivo | Console |
| 🔴 **BAIXATRON HACKER** | Download com estética cyberpunk | Console |
| 🔍 **EXTRACTRON** | Extração de PDFs com OCR | Web App |
| 🤖 **FORMTRON** | Automação de formulários | Console |
