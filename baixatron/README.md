# Baixatron — Auto Downloader Universal

Documentação formal da versão padrão (sem emojis).

## Visão Geral

Baixatron é um script JavaScript para automatizar o download de múltiplos arquivos em páginas web. Possui painel visual, modo console, detecção de links de download e acompanhamento de progresso.

## Principais Funcionalidades

- Painel visual com controles de escaneamento, início, pausa, seleção e reset
- Detecção de links de download em páginas comuns e dentro de iframes
- Seleção de itens a serem processados (checkbox por item)
- Barra de progresso com porcentagem e tempo estimado restante
- Estatísticas em tempo real: fila, ativos, processados, selecionados, erros
- Controle de velocidade (intervalo entre ações) configurável
- Mecanismo de repetição (retry) com limite de tentativas
- Execução serial por padrão (`concurrency: 1`), ajustável

## Uso

### Via Painel Visual

1. Carregue a página desejada e abra as ferramentas de desenvolvedor (F12 > Console)
2. Injete o script ou instale via Tampermonkey
3. Utilize os botões do painel:
   - Escanear: localiza todos os links de download
   - Iniciar: inicia o processamento dos itens selecionados
   - Pausar: interrompe temporariamente o processo
   - Selecionar todos / Nenhum: gerencia seleção
   - Reset: limpa fila, seleção, processados e erros
   - Alternar tema: modo claro/escuro

### Via Console

```javascript
// Escanear downloads
__dl.scan()

// Iniciar/Pausar/Resetar
__dl.start(); __dl.stop(); __dl.reset();

// Seleção
__dl.selectAll(); __dl.deselectAll(); __dl.toggleSelect(key);

// Configuração
__dl.opts;                   // ver opções atuais
__dl.setOptions({ delayMs: 1200, maxClicks: 10, dryRun: false });

// Estado
__dl.state.queue; __dl.state.processed; __dl.state.errors; __dl.state.selectedKeys;
```

## Opções (Resumo)

- `dryRun` (boolean): inicia em modo seguro, sem acionar downloads reais (padrão: `true`)
- `delayMs` (number): intervalo entre itens/ações
- `waitForDownload` (boolean) e `waitForDownloadTimeout` (ms): aguarda conclusão após clique
- `concurrency` (number): quantidade de itens processados em paralelo
- `maxRetries` (number): tentativas por item em caso de erro
- `maxClicks` (number): limite superior de itens a processar
- `dedupe` (boolean): evita repetir itens já concluídos

## Progresso e Tempo Estimado

A barra de progresso exibe a porcentagem concluída e o tempo restante estimado, calculado pela média de duração dos itens já processados. O valor é atualizado conforme o processamento avança.

## Formatos Suportados

PDF, DOC, DOCX, ODT, XLS, XLSX, ODS, CSV, PPT, PPTX, ZIP, RAR, 7Z, TXT, RTF.

## Compatibilidade

- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Páginas com conteúdo em iframes (Scriptcase, WPDM, Elementor)

## Limitações e Observações

- O download é iniciado via clique no elemento. O destino é controlado pelo navegador (pasta padrão de downloads). Não há seleção de pasta customizada.
- O modo seguro (`dryRun: true`) evita que downloads reais sejam acionados até que seja desativado.
- A detecção de links ignora elementos de UI comuns para reduzir cliques indevidos.

## Versão

v3.0 — Versão padrão com painel visual, progresso percentual e tempo estimado.

