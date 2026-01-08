(async function() {
    // Estado de controle
    const state = {
        paused: false,
        stopped: false,
        currentIndex: 0,
        total: 0
    };

    // Criar janela de controle
    const createControlWindow = () => {
        const controlDiv = document.createElement('div');
        controlDiv.id = 'script-control';
        controlDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            min-width: 280px;
            backdrop-filter: blur(10px);
        `;

        controlDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600;">🎛️ Controle do Script</h3>
                <button id="closeBtn" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " title="Fechar janela">✕</button>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; margin-bottom: 6px; opacity: 0.9;">
                    📋 Começar a partir do decreto:
                </label>
                <div style="display: flex; gap: 8px;">
                    <input 
                        type="text" 
                        id="startFromInput" 
                        placeholder="Ex: 123"
                        style="
                            flex: 1;
                            padding: 8px 12px;
                            border: 2px solid rgba(255, 255, 255, 0.3);
                            border-radius: 6px;
                            background: rgba(255, 255, 255, 0.15);
                            color: white;
                            font-size: 14px;
                            outline: none;
                            transition: all 0.2s;
                        "
                    />
                    <button id="applyStartBtn" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 6px;
                        background: rgba(255, 255, 255, 0.25);
                        color: white;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                        white-space: nowrap;
                    ">Aplicar</button>
                </div>
                <div id="startInfo" style="font-size: 11px; margin-top: 6px; opacity: 0.7; min-height: 14px;"></div>
            </div>
            <div style="margin-bottom: 12px;">
                <div id="status" style="font-size: 14px; opacity: 0.9;">
                    Aguardando início...
                </div>
                <div id="progress" style="margin-top: 8px; font-size: 13px; opacity: 0.8;">
                    0 / 0
                </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="pauseBtn" style="
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 100px;
                " disabled>⏸️ Pausar</button>
                <button id="stopBtn" style="
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    background: rgba(255, 59, 48, 0.8);
                    color: white;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-width: 100px;
                ">⏹️ Parar</button>
            </div>
        `;

        document.body.appendChild(controlDiv);

        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const closeBtn = document.getElementById('closeBtn');
        const startFromInput = document.getElementById('startFromInput');
        const applyStartBtn = document.getElementById('applyStartBtn');
        const startInfo = document.getElementById('startInfo');

        pauseBtn.addEventListener('click', () => {
            state.paused = !state.paused;
            pauseBtn.textContent = state.paused ? '▶️ Continuar' : '⏸️ Pausar';
            pauseBtn.style.background = state.paused ? 'rgba(52, 199, 89, 0.8)' : 'rgba(255, 255, 255, 0.2)';
            updateStatus(state.paused ? '⏸️ Pausado' : '▶️ Executando...');
        });

        stopBtn.addEventListener('click', () => {
            state.stopped = true;
            updateStatus('⏹️ Parando...');
        });

        closeBtn.addEventListener('click', () => {
            document.getElementById('script-control').style.display = 'none';
        });

        // Estilo hover para o input
        startFromInput.addEventListener('focus', function() {
            this.style.background = 'rgba(255, 255, 255, 0.25)';
            this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });
        startFromInput.addEventListener('blur', function() {
            this.style.background = 'rgba(255, 255, 255, 0.15)';
            this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });

        // Adicionar efeito hover
        const buttons = [pauseBtn, stopBtn, closeBtn, applyStartBtn];
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
                this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            });
        });

        return { pauseBtn, stopBtn, closeBtn, startFromInput, applyStartBtn, startInfo };
    };

    const updateStatus = (text) => {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = text;
    };

    const updateProgress = () => {
        const progressEl = document.getElementById('progress');
        if (progressEl) progressEl.textContent = `${state.currentIndex} / ${state.total}`;
    };

    // Função para aguardar enquanto pausado
    const waitWhilePaused = async () => {
        while (state.paused && !state.stopped) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    // Função para aguardar um elemento aparecer ou desaparecer
    const waitForElement = async (selector, shouldExist = true, timeout = 10000) => {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (state.stopped) throw new Error('Script parado pelo usuário');
            await waitWhilePaused();
            
            const element = document.querySelector(selector);
            if (shouldExist && element) return element;
            if (!shouldExist && !element) return true;
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Timeout aguardando elemento: ${selector}`);
    };

    // Função para aguardar o salvamento ser concluído
    const waitForSaveComplete = async () => {
        // Aguarda o botão de salvar desaparecer (indicando que salvou)
        // ou aguarda feedback visual de sucesso
        await new Promise(resolve => setTimeout(resolve, 500)); // pequena pausa inicial
        
        // Aguarda até que o botão "Novo" esteja disponível novamente
        const novoBtn = await waitForElement('button[aria-label="Novo"]', true, 10000);
        
        // Aguarda um pouco mais para garantir que a UI estabilizou
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return true;
    };

    const arquivos = await new Promise((resolve) => {
        // Cria um input de arquivo escondido
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            const arquivo = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = readerEvent => {
                const conteudo = readerEvent.target.result;
                const dados = JSON.parse(conteudo); // Converte texto para objeto JS
                resolve(dados);
            };
            
            reader.readAsText(arquivo);
        };

        input.click(); // Abre a janelinha de abrir arquivo
    });

    // Inicializar controles
    const { pauseBtn, startFromInput, applyStartBtn, startInfo } = createControlWindow();
    
    let arquivosFiltrados = arquivos;
    let skippedCount = 0;

    // Função para aplicar o filtro de início
    const applyStartFilter = async () => {
        const numeroInicial = startFromInput.value.trim();
        
        if (!numeroInicial) {
            arquivosFiltrados = arquivos;
            skippedCount = 0;
            state.total = arquivos.length;
            state.currentIndex = 0;
            updateProgress();
            startInfo.textContent = 'Processando todos os decretos';
            startInfo.style.color = 'rgba(255, 255, 255, 0.9)';
            return;
        }

        const index = arquivos.findIndex(item => 
            item.numeroDecreto?.toString() === numeroInicial || 
            item.numero?.toString() === numeroInicial
        );
        
        if (index !== -1) {
            arquivosFiltrados = arquivos.slice(index);
            skippedCount = index;
            state.total = arquivosFiltrados.length;
            state.currentIndex = 0;
            updateProgress();
            startInfo.textContent = `✓ Pulando ${skippedCount} decreto(s)`;
            startInfo.style.color = '#4ade80';
            console.log(`✂️ Pulando ${skippedCount} decretos. Começando pelo decreto: ${numeroInicial}`);
        } else {
            startInfo.textContent = `✗ Decreto "${numeroInicial}" não encontrado`;
            startInfo.style.color = '#fca5a5';
        }

        await loop();
    };

    // Event listeners para o filtro
    applyStartBtn.addEventListener('click', () => applyStartFilter());
    startFromInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyStartFilter();
        }
    });

    state.total = arquivos.length;
    updateProgress();
    startInfo.textContent = `Total: ${arquivos.length} decreto(s) no arquivo`;
    startInfo.style.color = 'rgba(255, 255, 255, 0.7)';

    // função para pausa
    const sleep = async (ms) => {
        const startTime = Date.now();
        while (Date.now() - startTime < ms) {
            if (state.stopped) throw new Error('Script parado pelo usuário');
            await waitWhilePaused();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    // Função auxiliar para disparar eventos e garantir que o framework (Vue) detecte a mudança
    const fillInput = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) {
            el.value = value;
            el.focus();
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });

            el.dispatchEvent(enterEvent);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Preenchido: ${selector}`);
        } else {
            console.warn(`Elemento não encontrado: ${selector}`);
        }
    };

    const click = (selector) => {
        const el = document.querySelector(selector);
        if (el) {
            el.focus();
            el.click();
        } else {
            console.warn(`Elemento não encontrado: ${selector}`);
        }
    };

    const loop = async () => {
        try {
            pauseBtn.disabled = false;
            startFromInput.disabled = true;
            applyStartBtn.disabled = true;
            
            for (const data of arquivosFiltrados) {
                if (state.stopped) break;
                
                state.currentIndex++;
                updateProgress();
                updateStatus(`▶️ Processando item ${state.currentIndex}/${state.total}`);
                
                await waitWhilePaused();
                
                // 1. Preencher o tipo de documento
                fillInput('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(1) > div > div:nth-child(1) > span > div > div > div:nth-child(1) > span > div > div > span > input', data.numero)
                await sleep(2000)
                click('#tipo_documento > div');
                await sleep(400);
                click('#tipo_documento_6');
                await sleep(400);
                
                // 2. Preencher Número (InputNumber do PrimeVue)
                fillInput('#numero input', data.numeroDoDocumento);

                // 3. Preencher letra
                if (data.letra) {
                    fillInput('#letra', data.letra);
                }

                // 3. Preencher Data (Calendar do PrimeVue)
                fillInput('#data input', data.data);

                // 4. Preencher Descrição (Textarea)
                fillInput('textarea.p-inputtextarea', data.descricao);

                // 5. clicar no botão de link
                click('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(2) > div.tw-grid.tw-grid-cols-12 > div > span > div > div.p-fileupload-buttonbar.border-500 > div > div.flex.gap-2 > button.p-button.p-component.p-button-icon-only.p-button-help.p-button-rounded.p-button-outlined');

                // 6. Preenchar link
                await sleep(400);
                fillInput('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(2) > div.tw-grid.tw-grid-cols-12 > div > span > div > div.p-fileupload-content.border-500 > div > div > div > span > input', data.url);

                // 7. salvar
                updateStatus(`💾 Salvando item ${state.currentIndex}...`);
                click('#acao-form button[aria-label="Salvar"]');
                
                try {
                    // Aguarda o salvamento ser concluído
                    await waitForSaveComplete();

                    // 8. Criar novo
                    if (state.currentIndex < state.total) {
                        updateStatus(`➕ Criando novo formulário...`);
                        click('button[aria-label="Novo"]');
                        await sleep(1000); // Pequena pausa para o formulário limpar
                    }
                } catch (error) {
                    if (error.response && error.response.message.includes('Too Many Attemps')) {
                        // 9. se o backend não aceitar por muitas requisições espera 20 segundos e tenta de novo
                        await sleep(20000);
                        updateStatus(`💾 Salvando item ${state.currentIndex}...`);
                        click('#acao-form button[aria-label="Salvar"]');
                        // Aguarda o salvamento ser concluído
                        await waitForSaveComplete();

                        // 8. Criar novo
                        if (state.currentIndex < state.total) {
                            updateStatus(`➕ Criando novo formulário...`);
                            click('button[aria-label="Novo"]');
                            await sleep(1000); // Pequena pausa para o formulário limpar
                        }
                    }
                    console.error(error);
                }
                    
                console.log(`✅ Item ${state.currentIndex}/${state.total} concluído!`);
            }

            if (state.stopped) {
                updateStatus('⏹️ Script parado pelo usuário');
            } else {
                updateStatus(`✅ Concluído! ${state.total} itens processados`);
            }
            
        } catch (error) {
            console.error('❌ Erro:', error);
            updateStatus(`❌ Erro: ${error}`);
        }
    };
})();