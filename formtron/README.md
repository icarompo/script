# FORMTRON - Automação de Formulários Web

Sistema de preenchimento automático de formulários web via console do navegador, com controle de ritmo, pausa/retomada e recuperação de falhas.

## Descrição

FORMTRON é um script de automação que lê dados estruturados em JSON e preenche formulários web de forma programática. Desenvolvido para submissão em lote de decretos municipais em sistemas de gestão pública, oferece controle granular sobre o processo de envio.

## Funcionalidades

### Painel de Controle Interativo

- **Pausar/Retomar**: Interrompa e continue o processo a qualquer momento
- **Parar Definitivamente**: Encerra a execução mantendo registro de progresso
- **Iniciar de Decreto Específico**: Retome a partir de qualquer item da lista
- **Barra de Progresso**: Acompanhamento visual em tempo real
- **Estatísticas**: Total processado, taxa de sucesso, tempo decorrido

### Recursos Avançados

- **Retry Automático**: Aguarda 20 segundos e reprocessa em caso de rate limiting
- **Controle de Ritmo**: Intervalo configurável entre submissões (padrão: 1s)
- **Logs Detalhados**: Registro completo de cada operação no console
- **Modo Debug**: Informações técnicas sobre cada etapa do processo
- **Recuperação de Erros**: Continua processamento mesmo após falhas individuais

## Uso

### 1. Preparação

Certifique-se de ter o arquivo JSON gerado pelo **EXTRACTRON**:

```json
[
  {
    "numero": "001/2024",
    "data": "01/01/2024",
    "letra": "A",
    "descricao": "Dispõe sobre...",
    "arquivo": "decreto_001_2024.pdf"
  }
]
```

### 2. Execução

1. Abra a página do formulário web no navegador
2. Abra o Console de Desenvolvedor (F12)
3. Cole todo o conteúdo de `formtron.js`
4. Pressione Enter para iniciar
5. Use o painel flutuante para controlar a execução

### 3. Controles Disponíveis

- **Botão Pausar**: Interrompe após o item atual
- **Botão Retomar**: Continua de onde parou
- **Botão Parar**: Encerra definitivamente
- **Campo "Iniciar do decreto"**: Digite o número para começar daquele item

## Configuração

### Variáveis Principais

```javascript
// Intervalo entre submissões (milissegundos)
const DELAY = 1000;

// Tempo de espera para retry (milissegundos)
const RETRY_DELAY = 20000;

// Caminho do arquivo JSON
const JSON_PATH = 'decretos.json';
```

### Seletores de Formulário

Ajuste os seletores CSS para corresponder ao formulário alvo:

```javascript
document.querySelector('input[name="numero"]').value = decreto.numero;
document.querySelector('input[name="data"]').value = decreto.data;
document.querySelector('textarea[name="descricao"]').value = decreto.descricao;
document.querySelector('button[type="submit"]').click();
```

## Fluxo de Trabalho

```
EXTRACTRON → JSON → FORMTRON → Sistema Web
```

1. EXTRACTRON extrai dados dos PDFs
2. JSON estruturado é gerado
3. FORMTRON lê o JSON via fetch
4. Para cada item:
   - Preenche campos do formulário
   - Submete dados
   - Aguarda intervalo configurado
   - Verifica resposta do sistema
   - Registra resultado

## Tratamento de Erros

### Rate Limiting (429)

Quando o servidor retorna limite de requisições:
- Script pausa automaticamente
- Aguarda 20 segundos
- Reprocessa o item atual
- Continua normalmente

### Falhas de Rede

- Registra erro no console
- Marca item como falha
- Continua com próximo item
- Exibe resumo ao final

### Erros de Validação

- Captura mensagens do sistema
- Registra campo problemático
- Permite ajuste manual
- Opção de pular ou reprocessar

## Painel de Controle

### Informações Exibidas

- **Progresso**: X/Y decretos processados
- **Status**: Executando / Pausado / Parado
- **Tempo**: Tempo decorrido desde o início
- **Taxa de Sucesso**: Porcentagem de sucessos
- **Último Processado**: Número do último decreto

### Posicionamento

- Painel flutuante no canto superior direito
- Arrastável para qualquer posição
- Botão de fechar (minimiza, não encerra script)
- Sempre visível acima de outros elementos (z-index: 10000)

## Limitações

- Requer execução manual no console (não é extensão de navegador)
- Funciona apenas com formulários acessíveis via JavaScript
- Não suporta autenticação automática em sistemas com login
- Pode ser bloqueado por sistemas com proteção anti-bot
- Limitado por políticas CORS para fetch de JSON local

## Compatibilidade

- Chrome/Edge 90+ (recomendado)
- Firefox 88+
- Requer JavaScript habilitado
- Necessita permissões de fetch para JSON local

## Segurança

- Executa apenas no contexto do console do usuário
- Não armazena credenciais
- Não envia dados para servidores externos
- Todo processamento é local no navegador

## Estrutura de Arquivos

```
formtron.js    - Script principal
```

Script standalone para execução via console do navegador. Não requer instalação ou dependências externas.
