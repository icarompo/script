# 🤖 SCRIPT TOOLKIT - Automação Web Completa

> Suite de ferramentas para automação de downloads, extração de dados e preenchimento de formulários

---

## 📂 Estrutura

```
script/
├── baixatron/             # Auto-Downloader
│   ├── baixatron.js       
│   └── README.md          # Documentação detalhada
│
├── extractron/            # Extrator de PDFs
│   ├── extractron.html    
│   └── README.md          # Documentação detalhada
│
├── formtron/              # Automação de Formulários
│   ├── formtron.js        
│   └── README.md          # Documentação detalhada
│
└── README.md              
```

---

## 👁️ Preview

| Ferramenta | O que faz | Como usa |
|------------|-----------|----------|
| **BAIXATRON** | Download automático em massa | Console / Userscript |
| **EXTRACTRON** | Extrai dados de PDFs via OCR | HTML (drag-drop) |
| **FORMTRON** | Preenche formulários automaticamente | Console / Userscript |

---

## 🎯 Ferramentas Disponíveis

### 📥 **BAIXATRON** - Auto-Downloader
- Painel visual com lista de downloads
- 12+ formatos suportados (PDF, DOCX, XLSX, ZIP, RAR, etc)
- Detecção inteligente + iframes
- Modo seguro por padrão (dryRun: true)
- API: `__dl.scan()`, `__dl.start()`, `__dl.stop()`

👉 [Documentação](baixatron/README.md)

### 🔍 **EXTRACTRON** - Extrator de PDFs
- Lê PDFs com texto nativo (PDF.js v3.11.174)
- OCR para PDFs digitalizados (Tesseract.js v5.0.4)
- Dashboard visual estilo Baixatron
- Drag-and-drop para múltiplos arquivos
- Exporta JSON estruturado

👉 [Documentação](extractron/README.md)

### 🤖 **FORMTRON** - Automação de Formulários
- Painel flutuante com controles intuitivos
- Pausar/retomar com atalhos (Espaço, S, T)
- Slider de velocidade (0.25x - 3x)
- Retry automático em rate limiting
- Tema persistente (claro/escuro)

👉 [Documentação](formtron/README.md)

---

## 📚 Documentação Completa

- **[BAIXATRON](baixatron/README.md)** - Download automático detalhado
- **[EXTRACTRON](extractron/README.md)** - Extração de PDFs com OCR
- **[FORMTRON](formtron/README.md)** - Automação de formulários

---

## 📞 Suporte

Dúvidas ou problemas?

1. Consulte a **documentação específica da ferramenta** (links acima)
2. Verifique os **logs do console** (F12 → Console)
3. Teste em **modo seguro/simulação primeiro**

**Entre em contato com Kiw1:** [@HelloKiw1](https://github.com/HelloKiw1)

---

## 📄 Licença

MIT - Use livremente, em qualquer projeto!

---

## 🙏 Agradecimentos

Suite desenvolvida para automação em processos de gestão pública brasileira.

**Agradecimento Especial:**  
Ao **Marcelo**, colega que muito trabalhou neste projeto. Infelizmente, atualmente se encontra distante, mas suas contribuições foram fundamentais para o desenvolvimento inicial dessa suite.

### Criadores

Uma co-criação de:

- **[Kiw1](https://github.com/HelloKiw1)** (Eduardo Henrique)
  
- **[João Gabriel Alves de Souza](https://github.com/JoaoGabrielAlvesdeSouza1210)**

---

**Escolha suas ferramentas e comece a automatizar agora!** 🚀
