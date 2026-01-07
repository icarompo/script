# 🔴 BAIXATRON HACKER EDITION

> SISTEMA DE INVASÃO DE DOWNLOADS - ELITE HACKER MODE 🎮

## 👾 Visão Geral

**BAIXATRON HACKER** é a versão cyberpunk/hacker do auto-downloader com:
- Estética **neon green + ciano** futurista
- Painel com design **retro-futurista** tipo matriz
- Logger colorido no **console**
- Animações **glitch** e **blink**
- Sintaxe hacker: `< COMANDO >`, `[STATUS]`

## 🎨 Estética Cyberpunk

### Paleta de Cores Neon

| Cor | Código | Uso |
|-----|--------|-----|
| **Verde Neon** | #00ff41 | Principal, sucesso |
| **Ciano** | #00ffff | Secundário, info |
| **Vermelho** | #ff0055 | Erros, danger |
| **Amarelo** | #ffff00 | Aviso, processando |
| **Fundo** | #0a0e27 | Preto profundo |

### Efeitos Visuais

✨ **Animações:**
- Glitch no header (alterna cores neon)
- Blink no terminal (cursor piscante)
- SlideIn suave com blur na entrada
- Neon glow em elementos ativos

🎮 **Tipografia:**
- Fonte monoespaço Courier New
- Sintaxe hacker em todos os botões
- Caixas `[ ]` ao redor de labels

## 🚀 Como Usar

### 1. **Via Painel Visual Hacker**

```javascript
// Cole no console (F12 > Console)
// Painel cyberpunk aparecerá no canto superior direito
```

**Botões (Sintaxe Hacker):**
- `< SCAN >` - Escanear downloads
- `< START >` - Iniciar processo
- `< STOP >` - Pausar
- `< SELECT >` - Selecionar todos
- `< CLEAR >` - Deselecionar
- `< RESET >` - Resetar sistema

**Estatísticas:**
- `[QUEUE]` - Fila de arquivos
- `[PWNED]` - Arquivos processados
- `[SELECT]` - Selecionados
- `[FAILED]` - Erros

### 2. **Via Console (Recomendado)**

```javascript
// Escanear página
__dl.scan()

// Iniciar downloads
__dl.start()

// Parar processo
__dl.stop()

// Resetar tudo
__dl.reset()

// Selecionar/desselecionar
__dl.selectAll()
__dl.deselectAll()
__dl.toggleSelect(key)
```

### 3. **Logger Colorido no Console**

Cada ação exibe logs em cores neon:

```
[BAIXATRON] >> INICIANDO SCAN DE DOWNLOADS... (ciano)
[BAIXATRON] >> ENCONTRADOS 15 ARQUIVOS (verde)
[BAIXATRON] [✓] documento.pdf (verde sucesso)
[BAIXATRON] [✗] ERRO: conexão perdida (vermelho)
[BAIXATRON] >> DOWNLOAD PAUSADO (amarelo)
```

## ⚙️ Configuração

### Modo Seguro (Padrão)

```javascript
__dl.setOptions({ dryRun: true })  // Simula cliques
__dl.start()
```

### Modo Real (CUIDADO!)

```javascript
__dl.setOptions({ dryRun: false })  // Downloads REAIS
__dl.start()
```

### Ajustar Velocidade

```javascript
__dl.setOptions({ delayMs: 1500 })  // 1.5 segundos entre cliques
```

## 🎯 Características Hacker

### Logger Customizado

```javascript
// 4 tipos de mensagens coloridas:
log('Mensagem', 'info')      // Verde #00ff41
log('Sucesso!', 'success')   // Verde bold
log('ERRO!', 'error')        // Vermelho #ff0055
log('Aviso', 'warning')      // Amarelo #ffff00
```

### Status em Tempo Real

- Barra de progresso com **glow neon**
- Animação blink em itens processando
- Checkbox com border neon
- Hover effects com efeitos luminosos

### Detecção Automática

✅ Detecta página tipo: `iframe-grid`, `direct-links`, `generic`
✅ Suporta iframes (Scriptcase, WPDM, Elementor)
✅ Filtra cliques acidentais em UI
✅ Deduplicação automática

## 📊 Console Output

```
╔═══════════════════════════════════════════╗
║  BAIXATRON HACKER EDITION ATIVADO        ║
║  > SISTEMA DE INVASÃO DE DOWNLOADS      ║
║  > ACESSO: ELITE HACKER MODE            ║
╚═══════════════════════════════════════════╝

[BAIXATRON] Sistema inicializado com sucesso!
[BAIXATRON] Comandos disponíveis no console:
  __dl.scan()      - Escanear downloads
  __dl.start()     - Iniciar downloads
  __dl.stop()      - Parar processo
  __dl.reset()     - Resetar sistema
```

## 🛡️ Segurança

- ✅ 100% vanilla JavaScript
- ✅ Sem dependências
- ✅ Modo seguro por padrão
- ✅ Deduplicação automática
- ✅ Filtragem de botões UI

## 🎮 Diferenças da Versão Standard

| Feature | Standard | Hacker |
|---------|----------|--------|
| **Estética** | Dark mode limpo | Cyberpunk neon |
| **Cores** | Monocromáticas | Verde/Ciano vibrante |
| **Logger** | Simples | Colorido e estilizado |
| **Animações** | Suave | Glitch + Blink |
| **Fonte** | System | Courier New monospace |
| **Sintaxe** | Neutro | Hacker mode |
| **Tema Claro** | Sim | Não |

## 🔄 Workflow Recomendado

1. Cole o script no console
2. Veja as mensagens de inicialização em neon
3. Execute `__dl.scan()` para encontrar downloads
4. Verifique a lista no painel
5. Deselecione itens indesejados (se necessário)
6. Execute `__dl.start()` para começar
7. Acompanhe o progresso no painel

## 📝 Exemplos de Uso

### Exemplo 1: Scan Básico

```javascript
__dl.scan()
// [BAIXATRON] >> INICIANDO SCAN DE DOWNLOADS...
// [BAIXATRON] >> ENCONTRADOS 8 ARQUIVOS
```

### Exemplo 2: Download Seletivo

```javascript
__dl.scan()
__dl.deselectAll()           // Deseleciona tudo
__dl.toggleSelect('key_5')   // Seleciona arquivo 5
__dl.setOptions({dryRun: false})
__dl.start()
```

### Exemplo 3: Monitorar via Console

```javascript
setInterval(() => {
  console.log(`Queue: ${__dl.state.queue.length}, Done: ${__dl.state.processed.length}`);
}, 1000);
__dl.start()
```

## 🌐 Compatibilidade

✅ Chrome, Firefox, Safari, Edge (versões modernas)
✅ Suporta qualquer website com links de download
✅ Funciona em páginas com iframes

## 📚 Versão

**v3.0 HACKER EDITION** - Cyberpunk aesthetic com logger neon

---

**HACK THE DOWNLOADS** 🎮
Desenvolvido por entusiastas de downloads automáticos
