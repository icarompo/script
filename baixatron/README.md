# 👾 BAIXATRON - Auto-Downloader Universal

> O Alien que invade downloads! 📡

## 🎯 Visão Geral

**BAIXATRON** é um script JavaScript universal para download automático de múltiplos arquivos em qualquer website. Funciona com painel visual intuitivo + modo console para controle total.

### ✨ Características

- **Painel Visual Completo** - Interface dark mode com tema claro optional
- **Detecção Inteligente** - Encontra downloads em qualquer site
- **Seleção Customizável** - Escolha quais arquivos baixar
- **Barra de Progresso** - Acompanhe o andamento em tempo real
- **Estatísticas em Vivo** - Fila, processados, erros, selecionados
- **Controle de Velocidade** - Ajuste o delay entre downloads (200ms - 3000ms)
- **Modo Seguro** - Começa com `dryRun: true` (sem downloads reais)
- **Suporte a iframes** - Funciona em sites com conteúdo em iframes
- **Múltiplos Formatos** - PDF, Word, Excel, PowerPoint, ZIP, RAR, 7Z, e mais

## 🚀 Como Usar

### 1. **Via Painel Visual** (Recomendado)

```javascript
// Cole o script no console (F12 > Console)
// Um painel aparecerá no canto superior direito
```

**Botões do Painel:**
- `[⊙] Escanear` - Encontra todos os downloads na página
- `[▶] Iniciar` - Começa o download automático
- `[⏸] Pausar` - Pausa o processo
- `[+] Todos` - Seleciona todos os itens
- `[-] Nenhum` - Deseleciona todos
- `[↻] Reset` - Limpa tudo e recomeça
- `🌙` - Alterna entre tema escuro/claro

### 2. **Via Console**

```javascript
// Escanear downloads
__dl.scan()

// Iniciar downloads
__dl.start()

// Parar o processo
__dl.stop()

// Resetar tudo
__dl.reset()

// Selecionar/desselecionar
__dl.selectAll()
__dl.deselectAll()
__dl.toggleSelect(key)
```

### 3. **Configuração Avançada**

```javascript
// Ver opções atuais
__dl.opts

// Desabilitar modo seguro (ATIVE DOWNLOADS REAIS)
__dl.setOptions({ dryRun: false })

// Mudar velocidade (ms entre downloads)
__dl.setOptions({ delayMs: 1200 })

// Limitar número de downloads
__dl.setOptions({ maxClicks: 10 })
```

### 4. **Acessar Estado Global**

```javascript
// Ver fila
__dl.state.queue

// Ver processados
__dl.state.processed

// Ver erros
__dl.state.errors

// Ver selecionados
__dl.state.selectedKeys
```

## ⚠️ Modo Seguro

**SEMPRE começa com `dryRun: true`** - isso significa que o script simula os cliques sem fazer downloads reais.

Para ativar downloads reais:

```javascript
__dl.setOptions({ dryRun: false })
__dl.start()
```

## 🎨 Temas

### Tema Escuro (Padrão)
- Fundo: #1a1a1a
- Texto: #ffffff
- Accent: #4CAF50 (sucesso), #ff9800 (processando), #dc3545 (erro)

### Tema Claro
- Clique no botão 🌙 no header do painel
- Cores automáticamente invertidas
- Preferência salva em localStorage

## 📋 Arquivos Suportados

- 📄 **Documentos**: PDF, DOC, DOCX, ODT
- 📊 **Planilhas**: XLS, XLSX, ODS, CSV
- 🎠 **Apresentações**: PPT, PPTX
- 📦 **Compactados**: ZIP, RAR, 7Z
- 📝 **Texto**: TXT, RTF

## 🔧 Compatibilidade

✅ Funciona em qualquer navegador moderno (Chrome, Firefox, Safari, Edge)
✅ Suporta sites com iframes (Scriptcase, WPDM, Elementor)
✅ Detecta automaticamente tipo de página

## 📊 Estatísticas do Painel

| Campo | Significado |
|-------|------------|
| **Fila** | Arquivos aguardando download |
| **Processados** | Arquivos já baixados |
| **Selecionados** | Itens marcados para download |
| **Erros** | Downloads que falharam |

## 🎯 Uso Recomendado

1. Cole o script no console
2. Clique em `[⊙] Escanear` para encontrar downloads
3. Deselecione itens que não quer (se necessário)
4. Ajuste a velocidade com o slider
5. Clique em `[▶] Iniciar` para começar
6. Acompanhe o progresso no painel

## 🛡️ Segurança

- ✅ Sem dependências externas
- ✅ 100% código vanilla JavaScript
- ✅ Modo seguro por padrão
- ✅ Deduplicação automática de itens
- ✅ Filtra cliques acidentais em botões de UI

## 📝 Notas

- O script **não precisa ser instalado**, basta colar no console
- Os downloads são feitos pelo navegador (não há proxy)
- A pasta de destino é a pasta padrão do navegador
- Você pode pausar e retomar a qualquer momento

## 🔄 Versão

**v3.0 - Alien Edition** com tema claro/escuro e painel visual completo

---

**Desenvolvido com ❤️ para invasores de downloads**
