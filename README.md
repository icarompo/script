# 📥 BAIXATRON - Auto-Downloader Universal

> Automatize downloads de múltiplos arquivos com estilo

Duas versões do melhor script de download automático em JavaScript:

## 📂 Estrutura

```
script/
├── baixatron/                    # Versão Standard
│   ├── baixatron.js              # Script com tema claro/escuro
│   └── README.md                 # Documentação detalhada
│
├── baixatron-hacker/             # Versão Hacker/Cyberpunk
│   ├── baixatron-hacker.js       # Script com estética neon
│   └── README.md                 # Guia da versão cyberpunk
│
└── README.md                     # Este arquivo
```

## 🎯 Qual Versão Escolher?

### 👾 **BAIXATRON** (Versão Standard)
**Para quem quer simplicidade e produtividade**

- ✅ Interface dark mode elegante
- ✅ Tema claro/escuro togável
- ✅ Painel minimalista e clean
- ✅ Suporta 12+ formatos de arquivo
- ✅ Detecção inteligente de downloads
- ✅ Estatísticas em tempo real
- ✅ Controle de velocidade ajustável

👉 [Ver documentação completa →](baixatron/README.md)

### 🔴 **BAIXATRON HACKER** (Versão Cyberpunk)
**Para quem ama estética futurista**

- ✅ Design neon verde + ciano
- ✅ Animações glitch e blink
- ✅ Logger colorido no console
- ✅ Painel tipo matriz/hacker
- ✅ Sintaxe hacker nos botões
- ✅ Mesma funcionalidade, estilo diferente
- ✅ Para users que curtem cyberpunk

👉 [Ver documentação completa →](baixatron-hacker/README.md)

## 📊 Comparativo

| Aspecto | Standard | Hacker |
|---------|----------|--------|
| **Fundo** | #1a1a1a (cinza escuro) | #0a0e27 (azul escuro) |
| **Cores Principais** | Branco/verde | Verde neon/ciano |
| **Animações** | Suave | Glitch + Blink |
| **Painel** | Moderno minimalista | Retro-futurista |
| **Console** | Minimal | Colorido (5 tipos) |
| **Tema Claro** | ✅ Sim (toggle) | ❌ Não (hacker only) |
| **Performance** | ⚡ Excelente | ⚡ Excelente |
| **Complexidade** | Baixa | Média |

## ⚡ Quick Start

### 1️⃣ Escolha sua Versão

```javascript
// OPÇÃO A: Standard (recomendado)
// Copie: baixatron/baixatron.js

// OPÇÃO B: Hacker (mais estilo)
// Copie: baixatron-hacker/baixatron-hacker.js
```

### 2️⃣ Cole no Console

1. Abra o site onde quer baixar arquivos
2. Pressione `F12` e vá para a aba **Console**
3. Cole todo o script e pressione **Enter**
4. Um painel aparecerá no canto superior direito

### 3️⃣ Comece a Usar

```javascript
__dl.scan()      // Encontra todos os downloads
__dl.start()     // Começa a baixar (modo seguro por padrão)
```

## 🚀 Comandos Básicos

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

## ✨ Funcionalidades Gerais

✅ Detecção Automática - Encontra downloads em qualquer site  
✅ Painel Visual - Interface flutuante intuitiva  
✅ Seleção Customizável - Escolha quais arquivos baixar  
✅ Barra de Progresso - Acompanhe em tempo real  
✅ Modo Seguro - Começa em simulação  
✅ Controle via Console - API completa para programadores  
✅ Múltiplos Formatos - PDF, Word, Excel, ZIP, RAR, etc.  
✅ Detecção de Iframes - Funciona em sites complexos  
✅ Deduplicação - Remove duplicatas automaticamente  

## 📁 Arquivos Suportados

- 📄 **Documentos**: PDF, DOC, DOCX, ODT, TXT
- 📊 **Planilhas**: XLS, XLSX, ODS, CSV
- 🎠 **Apresentações**: PPT, PPTX
- 📦 **Compactados**: ZIP, RAR, 7Z
- 📝 **Outros**: RTF, WPD, e mais

## 🌍 Tipos de Sites Detectados

### Scriptcase (Prefeituras Brasileiras)
```javascript
// Funciona em portais de decretos municipais
// Exemplo: Prefeitura de Babaçulândia
__dl.scan()      // Detecta automaticamente
```

### WordPress WPDM
```javascript
// Funciona em blogs e sites WordPress
// Com plugin Download Manager
```

### Elementor / Genérico
```javascript
// Qualquer site com links de download diretos
// Busca por extensões: .pdf, .docx, .xlsx, etc
```

## 🎨 Design & Estética

### Standard
- **Paleta**: Preto (#1a1a1a) + Branco (#ffffff)
- **Acentos**: Verde (#4CAF50), Laranja (#ff9800), Vermelho (#dc3545)
- **Fontes**: System fonts (-apple-system, Segoe UI)
- **Animações**: Transições suaves (0.3s)

### Hacker
- **Paleta**: Azul escuro (#0a0e27) + Verde neon (#00ff41) + Ciano (#00ffff)
- **Fontes**: Courier New (monospace)
- **Animações**: Glitch (3s), Blink (1s), SlideIn com blur
- **Efeito**: Neon shadows (0 0 20px rgba)

## 🔧 Compatibilidade

| Navegador | Status |
|-----------|--------|
| Chrome | ✅ Suportado |
| Firefox | ✅ Suportado |
| Safari | ✅ Suportado |
| Edge | ✅ Suportado |
| Opera | ✅ Suportado |

## 🛡️ Segurança

✅ Sem dependências externas  
✅ 100% código vanilla JavaScript  
✅ Roda localmente no seu navegador  
✅ Nenhum servidor externo  
✅ Filtro contra cliques acidentais  
✅ Deduplicação inteligente  
✅ Não afeta contas de usuário  
✅ Apenas simula cliques em links  

## 🐛 Troubleshooting

### "Nenhum arquivo encontrado"
- Certifique-se que está na página correta
- Tente atualizar a página (F5)
- Verifique se há links de download visíveis

### "Downloads não iniciam"
- Verifique se `dryRun` está `false`
- Certifique-se que tem arquivos selecionados
- Veja os logs no console (F12)

### "Script não aparece no painel"
- Cole novamente no console
- Abra DevTools (F12) e tente novamente
- Verifique se não está em modo privado/incógnito

## 📚 Documentação Completa

Para detalhes específicos de cada versão:

- **[BAIXATRON Standard](baixatron/README.md)** - Guia completo com temas, API, exemplos
- **[BAIXATRON Hacker](baixatron-hacker/README.md)** - Guia cyberpunk com cores, efeitos, console

## 💡 Dicas

1. **Teste primeiro em modo seguro** - Sempre comece com `dryRun: true`
2. **Deselecione itens indesejados** - Use a UI para marcar/desmarcar
3. **Ajuste a velocidade** - Se tiver muitos arquivos, aumente o delay
4. **Monitore o console** - Veja o que o script está fazendo
5. **Pause se necessário** - Use `__dl.stop()` para pausar a qualquer momento

## 📊 Casos de Uso

### Baixar Decretos de um Portal
```javascript
__dl.scan()           // Encontra decretos
__dl.selectAll()      // Seleciona todos
__dl.setOptions({ dryRun: false, delayMs: 800 })
__dl.start()          // Começa a baixar
```

### Baixar Documentos Selecionados
```javascript
__dl.scan()
// Deselecione manualmente os que não quer via UI
__dl.start()
```

### Monitorar Progresso
```javascript
__dl.scan()
setInterval(() => {
  console.log(`Progresso: ${__dl.state.processed.length}/${__dl.state.queue.length}`);
}, 1000);
__dl.setOptions({ dryRun: false })
__dl.start()
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique a documentação da sua versão
2. Leia os logs do console (F12)
3. Teste com modo `dryRun: true` primeiro
4. Veja exemplos nas documentações específicas

## 🎁 Extras

Ambas as versões incluem:

- **Console Logger** - Mensagens com status e erros
- **Painel Flutuante** - Interface intuitiva
- **Statistísticas** - Acompanhe o progresso
- **Controle de Velocidade** - Ajuste conforme necessário
- **API Completa** - Programação avançada via console

## 📄 Licença

MIT - Use livremente, em qualquer projeto! 

## 🙏 Agradecimentos

Desenvolvido para facilitar o download em massa de documentos públicos brasileiros.

---

**Escolha sua versão e comece a automatizar seus downloads agora!** 🚀

`👾 BAIXATRON` | Versão Standard - Clean & Produtivo  
`🔴 BAIXATRON HACKER` | Versão Cyberpunk - Futurista & Estilosa
