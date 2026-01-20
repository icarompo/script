// Configurar o PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.getElementById('pdfInput').addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    const totalFiles = files.length;
    let processedCount = 0;
    let errorCount = 0;
    const numeroDocumento = document.getElementById('select').value;
    const urlDocumentos = document.getElementById('urlDocumentos').value.trim();

    // Determinar o tipo do documento a partir da lista carregada
    let tipoDocumento = null;
    try {
        if (window.tiposDeDocumentos && Array.isArray(window.tiposDeDocumentos)) {
            const found = window.tiposDeDocumentos.find(t => String(t.id) === String(numeroDocumento));
            if (found) tipoDocumento = found.nome;
        }
        // fallback: usar texto do option (formato "id - nome")
        if (!tipoDocumento) {
            const option = document.getElementById('select').selectedOptions?.[0];
            if (option && option.textContent) {
                const parts = option.textContent.split(' - ');
                tipoDocumento = parts.length > 1 ? parts.slice(1).join(' - ').trim() : option.textContent.trim();
            }
        }
    } catch (e) {
        console.error('Erro determinando tipoDocumento:', e);
    }
    
    // Validar se o ID foi preenchido
    if (!numeroDocumento) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="card bg-base-100 shadow-xl fade-in">
                <div class="card-body">
                    <div class="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 class="font-bold">Erro: ID de Documentação Obrigatório</h3>
                            <div class="text-xs">É obrigatório preencher o ID de Documentação antes de selecionar os arquivos. Este ID identifica o tipo de documento.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Limpar seleção de arquivo
        document.getElementById('pdfInput').value = '';
        return;
    }
    
    // Validar se a URL foi preenchida
    if (!urlDocumentos) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="card bg-base-100 shadow-xl fade-in">
                <div class="card-body">
                    <div class="alert alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 class="font-bold">Erro: URL Base Obrigatória</h3>
                            <div class="text-xs">É obrigatório preencher a URL Base dos Documentos antes de selecionar os arquivos. Exemplo: https://seu-servidor.com/documentos/</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Limpar seleção de arquivo
        document.getElementById('pdfInput').value = '';
        return;
    }
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="card bg-base-100 shadow-xl fade-in">
            <div class="card-body">
                <div class="flex items-center justify-center gap-3">
                    <span class="loading loading-spinner loading-lg"></span>
                    <p class="text-lg">Processando arquivos em paralelo...</p>
                </div>
                <div id="progressContainer" class="mt-4" style="display:none;">
                    <div id="progressText" class="text-sm opacity-70 mb-2"></div>
                    <progress id="progressFill" class="progress progress-primary w-full" value="0" max="100"></progress>
                </div>
            </div>
        </div>
    `;
    // Exibir banner global de processamento
    updateProgress(0, totalFiles, 'Iniciando...');

    
    // Obter campos obrigatórios
    const camposObrigatorios = {
        numero: document.getElementById('obrigatorio_numero').checked,
        data: document.getElementById('obrigatorio_data').checked,
        descricao: document.getElementById('obrigatorio_descricao').checked,
        arquivo: document.getElementById('obrigatorio_arquivo').checked,
        letra: document.getElementById('obrigatorio_letra').checked
    };
    
    // Processar todos os arquivos em paralelo
    const decretos = await Promise.all(
        files.map(async (file) => {
            try {
                const decreto = await processarPDF(file, numeroDocumento, urlDocumentos, tipoDocumento);
                processedCount++;
                updateProgress(processedCount, totalFiles, `Processados: ${processedCount}/${totalFiles}` , errorCount);
                return decreto;
            } catch (error) {
                console.error(`Erro ao processar ${file.name}:`, error);
                processedCount++;
                errorCount++;
                updateProgress(processedCount, totalFiles, `Processados: ${processedCount}/${totalFiles}` , errorCount);
                return {
                    arquivo: file.name,
                    numeroDoDocumento: 'Erro no processamento',
                    data: 'Erro',
                    descricao: error.message,
                    erro: true
                };
            }
        })
    );
    
    // Filtrar valores nulos
    const decretosValidos = decretos.filter(d => d !== null);
    
    // Validar conforme campos obrigatórios
    const { documentosValidos, documentosFalhos } = validarDocumentos(decretosValidos, camposObrigatorios);

    errorCount = documentosFalhos.length;
    updateProgress(totalFiles, totalFiles, `Finalizado: ${documentosValidos.length} ok, ${documentosFalhos.length} falhas`, errorCount);
    
    exibirResultados(documentosValidos, documentosFalhos);
    
    // Download automático dos arquivos
    downloadArquivos(documentosValidos, documentosFalhos);
    hideProgress();
    
    console.log('ID de Documentação:', numeroDocumento);
    console.log('Documentos válidos:', documentosValidos);
    console.log('Documentos com falhas:', documentosFalhos);
});

function updateProgress(current, total, message, errors = 0) {
    const progressContainer = document.getElementById('progressContainer');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');

    const banner = document.getElementById('processingBanner');
    const bannerText = document.getElementById('processingText');
    const bannerFill = document.getElementById('processingProgress');

    const dashStatus = document.getElementById('dashStatus');
    const dashPercent = document.getElementById('dashPercent');
    const dashCounts = document.getElementById('dashCounts');
    const dashFill = document.getElementById('dashProgressFill');
    const statTotal = document.getElementById('statTotal');
    const statDone = document.getElementById('statDone');
    const statPending = document.getElementById('statPending');
    const statErrors = document.getElementById('statErrors');

    const percentage = Math.round((current / total) * 100);

    // Banner global no topo
    if (banner) banner.classList.remove('hidden');
    if (bannerText) bannerText.textContent = message;
    if (bannerFill) bannerFill.value = percentage;
    
    // Cartão local na página
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressFill) progressFill.value = percentage;
    if (progressText) progressText.textContent = `${message} - ${percentage}%`;

    // Painel estilo Baixatron
    if (dashStatus) dashStatus.textContent = message;
    if (dashPercent) dashPercent.textContent = `${percentage}%`;
    if (dashCounts) dashCounts.textContent = `${current} / ${total}`;
    if (dashFill) dashFill.style.width = `${percentage}%`;
    if (statTotal) statTotal.textContent = total;
    if (statDone) statDone.textContent = current;
    if (statPending) statPending.textContent = Math.max(0, total - current);
    if (statErrors) statErrors.textContent = errors;
}

function hideProgress() {
    const banner = document.getElementById('processingBanner');
    if (banner) banner.classList.add('hidden');
    const dashStatus = document.getElementById('dashStatus');
    if (dashStatus) dashStatus.textContent = 'Concluído';
}

function validarDocumentos(documentos, camposObrigatorios) {
    const documentosValidos = [];
    const documentosFalhos = [];
    
    documentos.forEach(doc => {
        let temErro = false;
        const erros = [];
        
        // Verificar se tem erro no processamento
        if (doc.erro) {
            temErro = true;
            erros.push('Erro no processamento do arquivo');
        }
        
        // Validar campos obrigatórios
        if (camposObrigatorios.numero && (!doc.numeroDoDocumento || doc.numeroDoDocumento === 'Erro no processamento')) {
            temErro = true;
            erros.push('Número do documento ausente ou inválido');
        }
        
        if (camposObrigatorios.data && (!doc.data || doc.data === 'Erro')) {
            temErro = true;
            erros.push('Data ausente ou inválida');
        }
        
        if (camposObrigatorios.descricao && (!doc.descricao || doc.descricao.trim() === '')) {
            temErro = true;
            erros.push('Descrição ausente ou vazia');
        }
        
        if (camposObrigatorios.arquivo && (!doc.arquivo || doc.arquivo.trim() === '')) {
            temErro = true;
            erros.push('Arquivo não informado');
        }
        
        if (temErro) {
            documentosFalhos.push({
                ...doc,
                motivos_falha: erros
            });
        } else {
            documentosValidos.push(doc);
        }
    });
    
    return { documentosValidos, documentosFalhos };
}

function downloadArquivos(documentosValidos, documentosFalhos) {
    let mensagem = '💾 Os arquivos JSON foram baixados automaticamente:\n\n';
    
    // Download do arquivo com documentos válidos
    if (documentosValidos.length > 0) {
        const fileValidos = new Blob([JSON.stringify(documentosValidos, null, 2)], { type: 'application/json' });
        const aValidos = document.createElement('a');
        aValidos.href = URL.createObjectURL(fileValidos);
        aValidos.download = 'informações_extraidos.json';
        aValidos.click();
        mensagem += '✅ informações_extraidos.json (documentos válidos)\n';
    }
    
    // Download do arquivo com documentos com falhas (se houver)
    if (documentosFalhos.length > 0) {
        const fileFalhos = new Blob([JSON.stringify(documentosFalhos, null, 2)], { type: 'application/json' });
        const aFalhos = document.createElement('a');
        aFalhos.href = URL.createObjectURL(fileFalhos);
        aFalhos.download = 'falha.json';
        
        // Aguardar um pouco para não fazer download simultâneo
        setTimeout(() => {
            aFalhos.click();
        }, 300);
        mensagem += '❌ falha.json (documentos com falhas)\n';
    }
    
    // Mostrar pop-up de confirmação
    alert(mensagem);
}

async function processarPDF(file, numeroDocumento, urlDocumentos, tipoDocumento) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let textoCompleto = '';
    let usouOCR = false;
    
    // Ler todas as páginas
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        
        // Se a página tem pouco ou nenhum texto, usar OCR
        if (pageText.trim().length < 50) {
            console.log(`Página ${i} de ${file.name} sem texto - usando OCR...`);
            const ocrText = await extrairTextoComOCR(page);
            textoCompleto += ocrText + ' ';
        } else {
            textoCompleto += pageText + ' ';
        }
    }
    
    // Extrair informações usando regex
    const decreto = extrairInformacoes(textoCompleto, file.name, numeroDocumento, urlDocumentos, tipoDocumento);
    return decreto;
}

async function extrairTextoComOCR(page) {
    try {
        // Renderizar a página como imagem
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Converter canvas para imagem e aplicar OCR
        const imageData = canvas.toDataURL('image/png');
        
        const result = await Tesseract.recognize(
            imageData,
            'por', // Português
        );

        return result.data.text;
    } catch (error) {
        console.error('Erro no OCR:', error);
        return '';
    }
}

function extrairInformacoesAta(texto, nomeArquivo, numeroDocumento, urlDocumentos, tipoDocumento) {
    // Extrair número da sessão - formatos: "Iº", "IIº", "1º", "2ª", etc.
    const regexNumeroAta = /ATA\s+DA?\s+([IVXivx]+|[\d]+)[ºª°]/i;
    const matchNumero = texto.match(regexNumeroAta);
    
    let numeroDoDocumento = null;
    if (matchNumero) {
        const numeroTexto = matchNumero[1];
        // Converter romano para número se necessário
        numeroDoDocumento = converterRomanoParaNumero(numeroTexto);
    }
    
    // Extrair data no formato "30.01.2025" ou "dd/mm/yyyy" ou "dd.mm.yyyy"
    const regexDataSimples = /(?:REALIZADA\s+EM\s+)?(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/i;
    const matchDataSimples = texto.match(regexDataSimples);
    
    let data = null;
    
    if (matchDataSimples) {
        const dia = parseInt(matchDataSimples[1]);
        const mes = parseInt(matchDataSimples[2]);
        const ano = parseInt(matchDataSimples[3]);
        
        // Converter para formato dd/mm/yyyy (formato brasileiro)
        data = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
    }
    
    // Extrair descrição até o primeiro ponto
    let descricao = '';
    const regexDescricao = /ATA\s+DA?\s+[^\.]+?\.([^\.]+?)\./i;
    const matchDescricao = texto.match(regexDescricao);
    
    if (matchDescricao) {
        descricao = matchDescricao[0].trim();
    } else {
        // Se não encontrou, pegar até o primeiro ponto depois de ATA
        const inicioAta = texto.search(/ATA\s+DA?\s+/i);
        if (inicioAta !== -1) {
            const textoAposAta = texto.substring(inicioAta);
            const primeiroPonto = textoAposAta.indexOf('.');
            if (primeiroPonto !== -1) {
                descricao = textoAposAta.substring(0, primeiroPonto + 1).trim();
            }
        }
    }
    
    return {
        numero: numeroDocumento,
        arquivo: nomeArquivo,
        numeroDoDocumento: numeroDoDocumento,
        data: data,
        letra: null,
        descricao: descricao.toUpperCase() || null,
        url: `${urlDocumentos}${encodeURIComponent(nomeArquivo)}`,
        tipoDocumento: tipoDocumento
    };
}

function converterRomanoParaNumero(romano) {
    // Se já for um número, retorna
    if (/^\d+$/.test(romano)) {
        return romano;
    }
    
    const romanos = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
        'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
        'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
        'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
    };
    
    return romanos[romano.toUpperCase()] || romano;
}

function converterDataParaExtenso(dia, mes, ano) {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    
    const mesesExtenso = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    
    const milhares = ['', 'mil', 'dois mil', 'três mil', 'quatro mil', 'cinco mil'];
    
    // Converter dia para extenso
    let diaExtenso = '';
    if (dia >= 10 && dia <= 19) {
        diaExtenso = especiais[dia - 10];
    } else {
        const dezena = Math.floor(dia / 10);
        const unidade = dia % 10;
        if (dezena > 0 && unidade > 0) {
            diaExtenso = dezenas[dezena] + ' e ' + unidades[unidade];
        } else if (dezena > 0) {
            diaExtenso = dezenas[dezena];
        } else {
            diaExtenso = unidades[unidade];
        }
    }
    
    // Converter ano para extenso
    const milhar = Math.floor(ano / 1000);
    const centena = Math.floor((ano % 1000) / 100);
    const dezenasAno = Math.floor((ano % 100) / 10);
    const unidadeAno = ano % 10;
    
    let anoExtenso = '';
    if (milhar === 2 && centena === 0) {
        anoExtenso = 'dois mil';
        if (dezenasAno >= 1 && dezenasAno <= 1 && unidadeAno >= 0) {
            if (dezenasAno === 1 && unidadeAno > 0) {
                anoExtenso += ' e ' + especiais[unidadeAno];
            } else if (dezenasAno === 1 && unidadeAno === 0) {
                anoExtenso += ' e dez';
            } else if (dezenasAno > 1) {
                anoExtenso += ' e ' + dezenas[dezenasAno];
                if (unidadeAno > 0) {
                    anoExtenso += ' e ' + unidades[unidadeAno];
                }
            }
        } else if (dezenasAno >= 2) {
            anoExtenso += ' e ' + dezenas[dezenasAno];
            if (unidadeAno > 0) {
                anoExtenso += ' e ' + unidades[unidadeAno];
            }
        } else if (unidadeAno > 0) {
            anoExtenso += ' e ' + unidades[unidadeAno];
        }
    }
    
    return `Aos ${diaExtenso} dias do mês de ${mesesExtenso[mes - 1]} de ${anoExtenso}`;
}

function extrairInformacoesProjetoLei(texto, nomeArquivo, numeroDocumento, urlDocumentos, tipoDocumento) {
    // Extrair número do projeto de lei - formato: "N" 002/2024" ou "Nº 002/2024"
    const regexNumeroProjeto = /PROJETO\s+DE\s+LEI\s+N["ºª°\s]+(\d+(?:[\.\/\-]\d+)*)/i;
    const matchNumero = texto.match(regexNumeroProjeto);
    
    let numeroDoDocumento = null;
    if (matchNumero) {
        numeroDoDocumento = matchNumero[1];
    }
    
    // Mapa de meses em português
    const meses = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };
    
    // Extrair data no formato "19 DE FEVEREIRO DE 2024"
    const regexDataExtenso = /(\d{1,2})\s+DE\s+([A-ZÇÃÕÁÉÍÓÚÂÊÔÀ]+)\s+DE\s+(\d{4})/i;
    const matchDataExtenso = texto.match(regexDataExtenso);
    
    let data = null;
    
    if (matchDataExtenso) {
        const dia = parseInt(matchDataExtenso[1]);
        const mesNome = matchDataExtenso[2].toLowerCase();
        const mes = meses[mesNome] || '01';
        const ano = parseInt(matchDataExtenso[3]);
        
        // Converter para formato dd/mm/yyyy (formato brasileiro)
        data = `${dia.toString().padStart(2, '0')}/${mes}/${ano}`;
    }
    
    // Descrição - melhorada para capturar o conteúdo principal
    let descricao = '';
    
    // Procurar palavras-chave comuns em decretos
    const palavrasChave = [
        'dispõe sobre',
        'dispõe',
        'altera',
        'revoga',
        'autorizada',
        'estabelece',
        'institui',
        'regulamenta',
        'aprova',
        'autoriza',
        'nomeia',
        'exonera',
        'designa',
        'fixa',
        'cria',
        'extingue',
        'torna',
        'dispensa',
        'declara',
        'determina',
        'ementa',
        'concede'
    ];
    
    let inicioDescricao = -1;
    let palavraEncontrada = '';
    
    for (const palavra of palavrasChave) {
        const index = texto.toLowerCase().indexOf(palavra.toLowerCase());
        if (index !== -1 && (inicioDescricao === -1 || index < inicioDescricao)) {
            inicioDescricao = index;
            palavraEncontrada = palavra;
        }
    }
    
    if (inicioDescricao !== -1) {
        // Extrair do início da descrição
        let textoDescricao = texto.substring(inicioDescricao);
        
        // Limpar espaços extras e quebras de linha
        textoDescricao = textoDescricao.replace(/\s+/g, ' ').trim();
        
        // Procurar o fim da descrição (antes de "e dá outras providências" ou artigo 1)
        const marcadoresFim = [
            ', e dá outras providências',
            ' e dá outras providências',
            'e dá outras providências',
            ', e outras providências'
        ];
        
        let fimDescricao = textoDescricao.length;
        let marcadorUsado = '';
        
        for (const marcador of marcadoresFim) {
            const index = textoDescricao.toLowerCase().indexOf(marcador.toLowerCase());
            if (index !== -1 && index < fimDescricao) {
                fimDescricao = index;
                marcadorUsado = marcador;
            }
        }
        
        // Se não encontrou nenhum marcador, pegar até o primeiro ponto seguido de maiúscula
        if (fimDescricao === textoDescricao.length) {
            const matchPonto = textoDescricao.match(/\.\s+[A-Z]/);
            if (matchPonto && matchPonto.index < 500) {
                fimDescricao = matchPonto.index + 1;
            }
        }
        
        descricao = textoDescricao.substring(0, fimDescricao).trim() + marcadorUsado;
        
        // Garantir que termina com pontuação
        if (descricao && !/[.!?,;]$/.test(descricao)) {
            const ultimoPonto = Math.max(
                descricao.lastIndexOf('.'),
                descricao.lastIndexOf(','),
                descricao.lastIndexOf(';')
            );
            if (ultimoPonto > 50) {
                descricao = descricao.substring(0, ultimoPonto + 1);
            } else {
                descricao += '.';
            }
        }
    }
    
    return {
        numero: numeroDocumento,
        arquivo: nomeArquivo,
        numeroDoDocumento: numeroDoDocumento?.includes('/') ? numeroDoDocumento.split('/')[0] : numeroDoDocumento ? numeroDoDocumento : null,
        data: data,
        letra: null,
        descricao: descricao.toUpperCase() || null,
        url: `${urlDocumentos}${encodeURIComponent(nomeArquivo)}`,
        tipoDocumento: tipoDocumento
    };
}

function extrairInformacoesLei(texto, nomeArquivo, numeroDocumento, urlDocumentos, tipoDocumento) {
    // Extrair número de lei - formato: "N" 002/2024" ou "Nº 002/2024"
    const regexNumeroProjeto = /L\s*E\s*.+\s+([A-ZÁ]*\s+)?(?:MUNICIPAL\s+)?N[°ºª\s]+/i;
    const matchNumero = texto.match(regexNumeroProjeto);

    let numeroDoDocumento = null;
    if (matchNumero) {
        console.log(matchNumero);
        numeroDoDocumento = matchNumero[2];
        numeroDoDocumento = numeroDoDocumento?.includes(' ') ? numeroDoDocumento?.replace(' ', '') : numeroDoDocumento;
    }

    // Mapa de meses em português
    const meses = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };

    // Extrair data no formato "19 DE FEVEREIRO DE 2024"
    let regexDataExtenso = /(\d{1,2})\s+(?:DE\s+|\s+)([A-ZÇÃÕÁÉÍÓÚÂÊÔÀ]+)(?:\s+DE\s+|\s+)(\d{4})/i;

    let matchDataExtenso = texto.match(regexDataExtenso);

    let data = null;

    if (matchDataExtenso) {
        const dia = parseInt(matchDataExtenso[1]);
        const mesNome = matchDataExtenso[2].toLowerCase();
        const mes = meses[mesNome] || '01';
        const ano = parseInt(matchDataExtenso[3]);

        // Converter para formato dd/mm/yyyy (formato brasileiro)
        data = `${dia.toString().padStart(2, '0')}/${mes}/${ano}`;
    } else {
        regexDataExtenso = /(\d{1,2})\s+(\([a-z]+\))?\s*(?:dias?\s+do\s+mês\s+de\s+)?([A-ZÇÃÕÁÉÍÓÚÂÊÔÀ]+)\s+(?:de\s+)?(\d{4})/i;
        const dia = parseInt(matchDataExtenso[1]);
        const mesNome = matchDataExtenso[2].toLowerCase();
        const mes = meses[mesNome] || '01';
        const ano = parseInt(matchDataExtenso[3]);

        // Converter para formato dd/mm/yyyy (formato brasileiro)
        data = `${dia.toString().padStart(2, '0')}/${mes}/${ano}`;
        matchDataExtenso = texto.match(regexDataExtenso);

        if (matchDataExtenso) {
            const dia = parseInt(matchDataExtenso[1]);
            const mesNome = matchDataExtenso[2].toLowerCase();
            const mes = meses[mesNome] || '01';
            const ano = parseInt(matchDataExtenso[3]);

            // Converter para formato dd/mm/yyyy (formato brasileiro)
            data = `${dia.toString().padStart(2, '0')}/${mes}/${ano}`;
        }
    }

    // Descrição - melhorada para capturar o conteúdo principal
    let descricao = '';

    // Procurar palavras-chave comuns em decretos
    const palavrasChave = [
        'dispõe sobre',
        'dispõe',
        'altera',
        'revoga',
        'autorizada',
        'estabelece',
        'institui',
        'regulamenta',
        'aprova',
        'autoriza',
        'nomeia',
        'exonera',
        'designa',
        'fixa',
        'cria',
        'extingue',
        'torna',
        'dispensa',
        'declara',
        'determina',
        'ementa',
        'concede'
    ];

    let inicioDescricao = -1;
    let palavraEncontrada = '';

    for (const palavra of palavrasChave) {
        const index = texto.toLowerCase().indexOf(palavra.toLowerCase());
        if (index !== -1 && (inicioDescricao === -1 || index < inicioDescricao)) {
            inicioDescricao = index;
            palavraEncontrada = palavra;
        }
    }

    if (inicioDescricao !== -1) {
        // Extrair do início da descrição
        let textoDescricao = texto.substring(inicioDescricao);

        // Limpar espaços extras e quebras de linha
        textoDescricao = textoDescricao.replace(/\s+/g, ' ').trim();

        // Procurar o fim da descrição (antes de "e dá outras providências" ou artigo 1)
        const marcadoresFim = [
            ', e dá outras providências',
            ' e dá outras providências',
            'e dá outras providências',
            ', e outras providências'
        ];

        let fimDescricao = textoDescricao.length;
        let marcadorUsado = '';

        for (const marcador of marcadoresFim) {
            const index = textoDescricao.toLowerCase().indexOf(marcador.toLowerCase());
            if (index !== -1 && index < fimDescricao) {
                fimDescricao = index;
                marcadorUsado = marcador;
            }
        }

        // Se não encontrou nenhum marcador, pegar até o primeiro ponto seguido de maiúscula
        if (fimDescricao === textoDescricao.length) {
            const matchPonto = textoDescricao.match(/\.\s+[A-Z]/);
            if (matchPonto && matchPonto.index < 500) {
                fimDescricao = matchPonto.index + 1;
            }
        }

        descricao = textoDescricao.substring(0, fimDescricao).trim() + marcadorUsado;

        // Garantir que termina com pontuação
        if (descricao && !/[.!?,;]$/.test(descricao)) {
            const ultimoPonto = Math.max(
                descricao.lastIndexOf('.'),
                descricao.lastIndexOf(','),
                descricao.lastIndexOf(';')
            );
            if (ultimoPonto > 50) {
                descricao = descricao.substring(0, ultimoPonto + 1);
            } else {
                descricao += '.';
            }
        }
    }

    // Se não encontrou descrição, tentar pegar após o número do decreto
    if (!descricao && numeroDoDocumento) {
        const regexPosNumero = new RegExp(`decreto.*?${numeroDoDocumento}.*?([^\\n]{50,300})`, 'i');
        const matchPosNumero = texto.match(regexPosNumero);
        if (matchPosNumero) {
            descricao = matchPosNumero[1].replace(/\s+/g, ' ').trim().substring(0, 200) + '...';
        }
    }

    return {
        numero: numeroDocumento,
        arquivo: nomeArquivo,
        numeroDoDocumento: numeroDoDocumento?.includes('/') ? numeroDoDocumento.split('/')[0] : numeroDoDocumento ? numeroDoDocumento : null,
        data: data || null,
        letra: letraDoDocumento || null,
        descricao: descricao.toUpperCase() || null,
        url: `${urlDocumentos}${encodeURIComponent(nomeArquivo)}`,
        tipoDocumento: tipoDocumento
    };
}

function exibirResultados(documentosValidos, documentosFalhos) {
    const resultsDiv = document.getElementById('results');
    
    let html = `<div class="card bg-base-100 shadow-xl fade-in"><div class="card-body">`;
    
    // Resumo com stats
    html += `
        <div class="stats shadow mb-6 w-full">
            <div class="stat">
                <div class="stat-figure text-success">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="stat-title">Documentos Válidos</div>
                <div class="stat-value text-success">${documentosValidos.length}</div>
                <div class="stat-desc">Processados com sucesso</div>
            </div>
            
            ${documentosFalhos.length > 0 ? `
            <div class="stat">
                <div class="stat-figure text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="stat-title">Com Falhas</div>
                <div class="stat-value text-error">${documentosFalhos.length}</div>
                <div class="stat-desc">Requerem atenção</div>
            </div>
            ` : ''}
        </div>
    `;
    
    // Container com duas colunas
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
    
    // Coluna 1: Documentos válidos
    html += '<div class="space-y-4">';
    if (documentosValidos.length > 0) {
        html += `
            <div class="flex items-center gap-2 mb-4">
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    Válidos
                </h2>
                <div class="badge badge-success badge-lg">${documentosValidos.length}</div>
            </div>
        `;
        
        documentosValidos.forEach((documento, index) => {
            html += `
                <div class="card bg-base-200 shadow-md hover:shadow-xl transition-all hover:scale-[1.02]">
                    <div class="card-body p-4">
                        <h3 class="card-title text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ${documento.arquivo}
                        </h3>
                        <div class="divider my-2"></div>
                        <div class="text-sm space-y-2">
                            <div class="flex justify-between">
                                <span class="opacity-70">Número:</span>
                                <span class="badge badge-outline">${documento.numeroDoDocumento || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Data:</span>
                                <span class="badge badge-outline">${documento.data || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Tipo:</span>
                                <span class="badge badge-primary">${documento.tipoDocumento || 'DECRETO'}</span>
                            </div>
                            ${documento.descricao ? `
                            <div class="mt-3">
                                <p class="opacity-70 text-xs mb-1">Descrição:</p>
                                <p class="text-xs bg-base-300 p-2 rounded">${documento.descricao}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div class="text-center py-12 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>Nenhum documento válido</p>
            </div>
        `;
    }
    html += '</div>';
    
    // Coluna 2: Documentos com falhas
    html += '<div class="space-y-4">';
    if (documentosFalhos.length > 0) {
        html += `
            <div class="flex items-center gap-2 mb-4">
                <h2 class="text-2xl font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Com Falhas
                </h2>
                <div class="badge badge-error badge-lg">${documentosFalhos.length}</div>
            </div>
        `;
        
        documentosFalhos.forEach((documento, index) => {
            const motivos = documento.motivos_falha.map(m => `<li class="text-xs">${m}</li>`).join('');
            html += `
                <div class="card bg-error bg-opacity-10 border border-error shadow-md hover:shadow-xl transition-all">
                    <div class="card-body p-4">
                        <h3 class="card-title text-sm text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ${documento.arquivo}
                        </h3>
                        <div class="divider my-2"></div>
                        <div class="text-sm space-y-2">
                            <div class="flex justify-between">
                                <span class="opacity-70">Número:</span>
                                <span class="badge badge-outline badge-white">${documento.numeroDoDocumento || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="opacity-70">Data:</span>
                                <span class="badge badge-outline badge-white">${documento.data || 'N/A'}</span>
                            </div>
                            <div class="mt-3">
                                <p class="opacity-70 text-xs mb-2 font-semibold">Motivos da Falha:</p>
                                <ul class="list-disc list-inside space-y-1 text-white">
                                    ${motivos}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div class="text-center py-12 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Nenhum documento com falhas</p>
            </div>
        `;
    }
    html += '</div>';
    
    // Fechar container de colunas
    html += '</div></div></div>';
    
    if (documentosValidos.length === 0 && documentosFalhos.length === 0) {
        html = `
            <div class="card bg-base-100 shadow-xl fade-in">
                <div class="card-body text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p class="opacity-50">Nenhum documento foi processado.</p>
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
}

const dropdownList = async () => {
    const el = document.getElementById('tiposDeDocumentos');
    let items = [];

    if (window.tiposDeDocumentos && Array.isArray(window.tiposDeDocumentos)) {
        items = window.tiposDeDocumentos;
    } else if (el && el.textContent && el.textContent.trim()) {
        try {
            items = JSON.parse(el.textContent);
        } catch (e) {
            console.error('Erro parseando tiposDeDocumentos inline:', e);
        }
    } else {
        try {
            const mod = await import('./tiposDeDocumentos.js');
            items = mod.default ?? window.tiposDeDocumentos ?? [];
        } catch (e) {
            console.warn('Não foi possível carregar tiposDeDocumentos dinamicamente', e);
        }
    }

    const dropdownList = document.getElementById('select');

    items.forEach((item) => {
        dropdownList.innerHTML = dropdownList.innerHTML + `<option id="${item.id}" value="${item.id}">${item.id} - ${item.nome}</option>`;
    });
};

const selecionarTipo = (tipo) => {
    const numero = document.getElementById('obrigatorio_numero');
    const letra = document.getElementById('obrigatorio_letra');
    const publicarTransparencia = document.getElementById('portal');
    const publicarOficial = document.getElementById('diario');

    if (tipo?.aceitar_letra)
        letra.checked = true;

    if (tipo?.possui_numero)
        numero.checked = true;

    if (tipo?.publicar_portal)
        publicarTransparencia.checked = true;

    if (tipo?.publicar_diario)
        publicarOficial.checked = true;
};

// Inicializar dropdown
dropdownList();
