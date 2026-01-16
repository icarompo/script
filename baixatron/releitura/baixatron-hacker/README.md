# 🔴 BAIXATRON HACKER EDITION

> SISTEMA DE INVASÃO DE DOWNLOADS - ELITE HACKER MODE 🎮

## 👾 Visão Geral

Versão cyberpunk/hacker do auto-downloader com estética neon, logger colorido e painel com animações. Agora com os mesmos recursos de robustez da versão padrão: retry, timeout de espera de download, controle de concorrência, porcentagem de conclusão e tempo estimado.

## Novos Recursos (paridade com a versão padrão)

- Retry com limite de tentativas (`maxRetries`)
- Timeout configurável ao aguardar conclusão (`waitForDownloadTimeout`)
- Controle de concorrência com fila inteligente (`concurrency` + `runningSet`)
- Estatística "Active" mostrando itens em processamento
- Porcentagem de conclusão no painel
- Tempo regressivo estimado baseado na média de duração por item
- Função `toggleTheme()` disponível via console

## Estética Cyberpunk

### Paleta de Cores Neon

| Cor | Código | Uso |
|-----|--------|-----|
| Verde Neon | #00ff41 | Principal, sucesso |
| Ciano | #00ffff | Secundário, info |
| Vermelho | #ff0055 | Erros, danger |
| Amarelo | #ffff00 | Aviso, processando |
| Fundo | #0a0e27 | Preto profundo |

### Efeitos Visuais

- Glitch no header
- Blink em itens processando
- Slide-in com blur
- Glow neon em elementos ativos

## Como Usar

### Via Painel Visual Hacker

```javascript
// Cole no console (F12 > Console)
// Painel cyberpunk aparecerá no canto superior direito
```

Botões:
- `< SCAN >` Escanear downloads
- `< START >` Iniciar
- `< STOP >` Pausar
- `< SELECT >` Selecionar todos
- `< CLEAR >` Deselecionar
- `< RESET >` Resetar sistema

Estatísticas:
- Queue, Active, Pwned (processados), Select, Failed (erros)

### Via Console

```javascript
__dl.scan();
__dl.start();
__dl.stop();
__dl.reset();
__dl.selectAll();
__dl.deselectAll();
__dl.toggleSelect(key);

// Tema hacker claro/escuro (via console)
__dl.toggleTheme();

// Configuração
__dl.opts; // ver opções atuais
__dl.setOptions({ delayMs: 1200, maxClicks: 10, dryRun: false, maxRetries: 1, concurrency: 1, waitForDownloadTimeout: 3000 });
```

## Logger Colorido

```text
[BAIXATRON] >> INICIANDO SCAN DE DOWNLOADS...
[BAIXATRON] >> ENCONTRADOS 15 ARQUIVOS
[BAIXATRON] [✓] documento.pdf
[BAIXATRON] [✗] ERRO: conexão perdida
[BAIXATRON] >> DOWNLOAD PAUSADO
```

## Detecção Automática

- Detecta tipo de página: `iframe-grid`, `direct-links`, `generic`
- Suporta iframes (Scriptcase, WPDM, Elementor)
- Filtra cliques acidentais em UI
- Deduplicação automática

## Compatibilidade

- Chrome, Firefox, Safari, Edge (versões modernas)
- Qualquer website com links de download
- Páginas com iframes

## Diferenças para a Versão Padrão

| Feature | Standard | Hacker |
|---------|----------|--------|
| Estética | Dark mode limpo | Cyberpunk neon |
| Logger | Simples | Colorido e estilizado |
| Animações | Suave | Glitch + Blink |
| Fonte | System | Courier New |
| Tema Claro | Sim | Via `__dl.toggleTheme()` (console)

## Versão

v3.0 Hacker Edition — com logger neon, animações e paridade de recursos.

---

HACK THE DOWNLOADS 🎮
