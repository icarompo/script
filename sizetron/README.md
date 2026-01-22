# 📦 SIZETRON - Compressor Inteligente de PDF

> 🗜️ O algoritmo que deixa seus PDFs no tamanho certo!

**Versão:** 1.0  
**Autor:** HelloKiw1  
**GitHub:** [https://github.com/HelloKiw1](https://github.com/HelloKiw1)

---

## 📋 Descrição

O **SIZETRON** é um compressor de PDF inteligente e visual que permite reduzir o tamanho de arquivos PDF mantendo a qualidade desejada. Perfeito para adequar documentos ao limite de upload de sistemas corporativos (geralmente 50MB).

### ✨ Características Principais

- 🎯 **Interface Visual Moderna** - Design inspirado nos padrões BAIXATRON/EXTRACTRON
- 📊 **Dashboard Completo** - Estatísticas em tempo real de compressão
- ⚙️ **Controle Preciso** - Ajuste fino de qualidade e tamanho alvo
- 🎨 **Predefinições Inteligentes** - 4 modos de compressão prontos para usar
- 📈 **Progresso em Tempo Real** - Acompanhe cada etapa da compressão
- 💾 **Download Automático** - Arquivo comprimido baixado automaticamente
- 🌙 **Tema Dark** - Interface moderna e confortável para os olhos

---

## 🚀 Como Usar

### 1. **Selecionar Arquivo**
   - Arraste e solte um PDF na área indicada
   - Ou clique em "Selecionar Arquivo PDF"

### 2. **Configurar Compressão**
   
   **Opção A - Predefinições Rápidas:**
   - 🔥 **Máxima** - Compressão agressiva (~10MB)
   - ⚡ **Alta** - Boa compressão (~20MB)
   - ✨ **Balanceada** - Equilíbrio ideal (~50MB) - *Padrão*
   - 🎯 **Suave** - Compressão leve (~100MB)

   **Opção B - Configuração Manual:**
   - Ajuste o **slider de qualidade** (10% a 100%)
   - Defina o **tamanho alvo** em MB (1 a 200MB)

### 3. **Comprimir**
   - Clique em "🗜️ Comprimir PDF"
   - Acompanhe o progresso em tempo real
   - Aguarde o download automático

### 4. **Resultado**
   - Veja as estatísticas de economia
   - Compare tamanhos original vs comprimido
   - Download automático do arquivo "_comprimido.pdf"

---

## ⚙️ Configurações

### Limites e Padrões

| Configuração | Padrão | Mínimo | Máximo |
|-------------|--------|--------|--------|
| Qualidade | 70% | 10% | 100% |
| Tamanho Alvo | 50 MB | 1 MB | 200 MB |
| Formato Saída | PDF | - | - |

### Predefinições de Qualidade

```javascript
Máxima:      Qualidade 30%  → ~10MB alvo
Alta:        Qualidade 50%  → ~20MB alvo
Balanceada:  Qualidade 70%  → ~50MB alvo (Padrão)
Suave:       Qualidade 90%  → ~100MB alvo
```

---

## 📊 Como Funciona

### Processo de Compressão

1. **Carregamento** - PDF é carregado usando PDF.js
2. **Renderização** - Cada página é renderizada em canvas
3. **Compressão** - Imagens convertidas para JPEG com qualidade ajustável
4. **Reconstrução** - Novo PDF criado com jsPDF
5. **Download** - Arquivo comprimido baixado automaticamente

### Tecnologias Utilizadas

- **PDF.js** - Leitura e renderização de PDF
- **jsPDF** - Criação de novos PDFs
- **DaisyUI + Tailwind CSS** - Interface visual
- **HTML5 Canvas** - Processamento de imagens

---

## 🎨 Interface

### Dashboard Principal
```
┌─────────────────────────────────────────────────┐
│  📄 Arquivo    │ 📊 Original │ 📉 Comprimido │ 💾 Economia │
├─────────────────────────────────────────────────┤
│                 Zona de Upload                   │
│           (Drag & Drop / Click)                  │
├─────────────────────────────────────────────────┤
│         ⚙️ Configurações de Compressão           │
│  [Predefinições] [Qualidade] [Tamanho Alvo]    │
├─────────────────────────────────────────────────┤
│              Barra de Progresso                  │
├─────────────────────────────────────────────────┤
│          [🗜️ Comprimir] [🔄 Reset]              │
└─────────────────────────────────────────────────┘
```

### Log de Atividades
- ℹ️ Informações
- ✅ Sucessos
- ⚠️ Avisos
- ❌ Erros

---

## 💡 Dicas de Uso

### Para Melhor Compressão:
- Use qualidade entre 30-50% para PDFs grandes
- PDFs com muitas imagens comprimem melhor
- PDFs de texto puro têm compressão limitada

### Para Manter Qualidade:
- Use qualidade 70%+ para documentos importantes
- Teste diferentes níveis até encontrar o ideal
- Verifique o arquivo comprimido antes de usar

### Limites Corporativos:
- Padrão de 50MB é comum em sistemas empresariais
- Use predefinição "Balanceada" como ponto de partida
- Ajuste conforme necessário

---

## 📝 Exemplos de Uso

### Cenário 1: PDF Grande (100MB)
```
Arquivo: relatorio_anual.pdf (100MB)
Configuração: Balanceada (70%, 50MB alvo)
Resultado: relatorio_anual_comprimido.pdf (48MB)
Economia: 52%
```

### Cenário 2: PDF Muito Grande (200MB)
```
Arquivo: apresentacao.pdf (200MB)
Configuração: Alta (50%, 20MB alvo)
Resultado: apresentacao_comprimido.pdf (22MB)
Economia: 89%
```

### Cenário 3: PDF Próximo ao Limite (55MB)
```
Arquivo: contrato.pdf (55MB)
Configuração: Balanceada (70%, 50MB alvo)
Resultado: contrato_comprimido.pdf (49MB)
Economia: 11%
```

---

## 🔧 Personalização

### Alterar Limite Padrão
```javascript
// Linha 434 - sizetron.html
targetSizeMB: 50,  // Alterar para o limite desejado
```

### Adicionar Nova Predefinição
```html
<!-- Adicionar após linha 213 -->
<div class="quality-preset" data-quality="0.4" data-target="15">
    <div class="font-bold">🚀 Personalizada</div>
    <div class="text-xs opacity-70">~15MB alvo</div>
</div>
```

---

## 🐛 Solução de Problemas

### PDF Não Carrega
- Verifique se o arquivo é um PDF válido
- Alguns PDFs protegidos podem não funcionar
- Teste com outro arquivo

### Tamanho Ainda Grande
- Reduza a qualidade (30-50%)
- Diminua o tamanho alvo
- PDFs de texto puro comprimem menos

### Download Não Inicia
- Verifique bloqueadores de pop-up
- Tente outro navegador
- Limpe o cache

---

## 📚 Família de Scripts

Este script faz parte da família de ferramentas **-TRON**:

- **📡 BAIXATRON** - Download automático de arquivos
- **📄 EXTRACTRON** - Leitor e extrator de PDFs
- **📝 FORMTRON** - Automação de formulários
- **📦 SIZETRON** - Compressor de PDFs *(você está aqui)*

---

## 📄 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.

---

## 👨‍💻 Autor

**HelloKiw1**
- GitHub: [https://github.com/HelloKiw1](https://github.com/HelloKiw1)
- Versão: 1.0
- Data: Janeiro 2026

---

## 🎯 Roadmap

### Próximas Versões
- [ ] Compressão em lote (múltiplos arquivos)
- [ ] Mais formatos de saída
- [ ] OCR para PDFs escaneados
- [ ] Compressão em nuvem
- [ ] Previsão de tamanho final
- [ ] Comparação visual antes/depois

---

**🚀 SIZETRON - Deixe seus PDFs no tamanho certo!**
