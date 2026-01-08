(async function() {

    // Estado de controle
    const state = {
        paused: false,
        stopped: false,
        currentIndex: 0,
        total: 0,
        successCount: 0,
        errorCount: 0,
        startTime: null
    };

    // Criar janela de controle
    const createControlWindow = () => {
        const controlDiv = document.createElement('div');
        controlDiv.id = 'script-control';
        controlDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-width: 340px;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(59, 130, 246, 0.3);
        `;

        controlDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid rgba(59, 130, 246, 0.3); padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🤖</span>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; background: linear-gradient(90deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FORMTRON</h3>
                </div>
                <button id="closeBtn" style="background: rgba(239, 68, 68, 0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0;" title="Fechar janela">✕</button>
            </div>

            <div style="margin-bottom: 18px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 8px;">
                <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Status</div>
                <div id="status" style="font-size: 16px; font-weight: 600; color: #e0e7ff;">⏳ Aguardando início...</div>
            </div>

            <div style="margin-bottom: 18px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 11px; color: #cbd5e1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Progresso</span>
                    <span id="progressPercent" style="font-size: 13px; font-weight: 700; color: #3b82f6;">0%</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; overflow: hidden; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <div id="progressBar" style="height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: 0%; transition: width 0.4s ease; border-radius: 8px;"></div>
                </div>
                <div id="progressText" style="font-size: 12px; color: #94a3b8; margin-top: 6px; text-align: center; font-weight: 500;">0 / 0 decretos</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: #86efac; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Sucesso</div>
                    <div id="successCount" style="font-size: 18px; font-weight: 700; color: #22c55e;">0</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: #fca5a5; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Erro</div>
                    <div id="errorCount" style="font-size: 18px; font-weight: 700; color: #ef4444;">0</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
                <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: #d8b4fe; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Tempo</div>
                    <div id="timeElapsed" style="font-size: 16px; font-weight: 700; color: #a855f7;">00:00</div>
                </div>
                <div style="background: rgba(251, 146, 60, 0.1); border: 1px solid rgba(251, 146, 60, 0.3); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: #fed7aa; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px;">Taxa</div>
                    <div id="rateText" style="font-size: 16px; font-weight: 700; color: #fb923c;">0 por min</div>
                </div>
            </div>

            <div style="margin-bottom: 18px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <label style="display: block; font-size: 11px; color: #cbd5e1; margin-bottom: 8px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">📋 Iniciar do decreto:</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="startFromInput" placeholder="Ex: 123" style="flex: 1; padding: 10px 12px; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 8px; background: rgba(59, 130, 246, 0.08); color: white; font-size: 13px; outline: none; transition: all 0.2s; font-weight: 500;" />
                    <button id="applyStartBtn" style="padding: 10px 16px; border: none; border-radius: 8px; background: rgba(59, 130, 246, 0.3); color: white; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Aplicar</button>
                </div>
                <div id="startInfo" style="font-size: 11px; margin-top: 8px; color: #94a3b8; min-height: 14px; font-weight: 500;"></div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="pauseBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1)); color: white; cursor: pointer; font-weight: 600; transition: all 0.2s; min-width: 100px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(59, 130, 246, 0.5);" disabled>⏸️ Pausar</button>
                <button id="stopBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.2)); color: white; cursor: pointer; font-weight: 600; transition: all 0.2s; min-width: 100px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(239, 68, 68, 0.5);">⏹️ Parar</button>
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
            pauseBtn.textContent = state.paused ? '▶️ Retomar' : '⏸️ Pausar';
            pauseBtn.style.background = state.paused ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0.2))' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1))';
            pauseBtn.style.borderColor = state.paused ? 'rgba(34, 197, 94, 0.5)' : 'rgba(59, 130, 246, 0.5)';
            updateStatus(state.paused ? '⏸️ Pausado' : '▶️ Processando...');
        });

        stopBtn.addEventListener('click', () => {
            state.stopped = true;
            updateStatus('⏹️ Parando script...');
        });

        closeBtn.addEventListener('click', () => {
            document.getElementById('script-control').style.display = 'none';
        });

        startFromInput.addEventListener('focus', function() {
            this.style.background = 'rgba(59, 130, 246, 0.15)';
            this.style.borderColor = 'rgba(59, 130, 246, 0.6)';
        });

        startFromInput.addEventListener('blur', function() {
            this.style.background = 'rgba(59, 130, 246, 0.08)';
            this.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        });

        const buttons = [pauseBtn, stopBtn, closeBtn, applyStartBtn];
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });

        const updateTimer = setInterval(() => {
            if (state.startTime && !state.stopped) {
                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeEl = document.getElementById('timeElapsed');
                if (timeEl) {
                    timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                if (state.currentIndex > 0 && minutes > 0) {
                    const rate = Math.round((state.currentIndex / minutes) * 10) / 10;
                    const rateEl = document.getElementById('rateText');
                    if (rateEl) {
                        rateEl.textContent = `${rate} por min`;
                    }
                }
            }
        }, 1000);

        return { pauseBtn, stopBtn, closeBtn, startFromInput, applyStartBtn, startInfo, updateTimer };
    };

    const updateStatus = (text) => {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = text;
    };

    const updateProgress = () => {
        const progressEl = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');
        const progressBar = document.getElementById('progressBar');
        if (progressEl) {
            progressEl.textContent = `${state.currentIndex} / ${state.total} decretos`;
            const percentage = state.total > 0 ? Math.round((state.currentIndex / state.total) * 100) : 0;
            if (progressPercent) progressPercent.textContent = `${percentage}%`;
            if (progressBar) progressBar.style.width = `${percentage}%`;
        }
    };

    const waitWhilePaused = async () => {
        while (state.paused && !state.stopped) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

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

    const waitForSaveComplete = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const novoBtn = await waitForElement('button[aria-label="Novo"]', true, 10000);
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
    };

    const arquivos = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const arquivo = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const conteudo = readerEvent.target.result;
                const dados = JSON.parse(conteudo);
                resolve(dados);
            };
            reader.readAsText(arquivo);
        };
        input.click();
    });

    const { pauseBtn, startFromInput, applyStartBtn, startInfo } = createControlWindow();

    let arquivosFiltrados = arquivos;
    let skippedCount = 0;

    const applyStartFilter = async () => {
        const numeroInicial = startFromInput.value.trim();

        if (!numeroInicial) {
            arquivosFiltrados = arquivos;
            skippedCount = 0;
            state.total = arquivos.length;
            state.currentIndex = 0;
            updateProgress();
            startInfo.textContent = '📊 Processando todos os decretos';
            startInfo.style.color = 'rgba(255, 255, 255, 0.7)';
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

        if (numeroInicial) {
            state.startTime = Date.now();
            await loop();
        }
    };

    applyStartBtn.addEventListener('click', () => applyStartFilter());
    startFromInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyStartFilter();
    });

    state.total = arquivos.length;
    updateProgress();
    startInfo.textContent = `📊 Total: ${arquivos.length} decreto(s) no arquivo`;
    startInfo.style.color = 'rgba(255, 255, 255, 0.7)';

    const sleep = async (ms) => {
        const startTime = Date.now();
        while (Date.now() - startTime < ms) {
            if (state.stopped) throw new Error('Script parado pelo usuário');
            await waitWhilePaused();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

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
            updateStatus('▶️ Iniciando processamento...');

            for (const data of arquivosFiltrados) {
                if (state.stopped) break;

                state.currentIndex++;
                updateProgress();
                updateStatus(`▶️ Processando item ${state.currentIndex}/${state.total}`);

                await waitWhilePaused();

                try {
                    fillInput('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(1) > div > div:nth-child(1) > span > div > div > div:nth-child(1) > span > div > div > span > input', data.numero)
                    await sleep(2000)
                    click('#tipo_documento > div');
                    await sleep(400);
                    click('#tipo_documento_7');
                    await sleep(400);

                    fillInput('#numero input', data.numeroDecreto);

                    if (data.letra) {
                        fillInput('#letra', data.letra);
                    }

                    fillInput('#data input', data.data);
                    fillInput('textarea.p-inputtextarea', data.descricao);

                    click('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(2) > div.tw-grid.tw-grid-cols-12 > div > span > div > div.p-fileupload-buttonbar.border-500 > div > div.flex.gap-2 > button.p-button.p-component.p-button-icon-only.p-button-help.p-button-rounded.p-button-outlined');

                    await sleep(400);
                    fillInput('#acao-form > div:nth-child(1) > div.pt-1.w-full > div:nth-child(2) > div.tw-grid.tw-grid-cols-12 > div > span > div > div.p-fileupload-content.border-500 > div > div > div > span > input', data.url);

                    updateStatus(`💾 Salvando item ${state.currentIndex}/${state.total}...`);
                    click('#acao-form button[aria-label="Salvar"]');

                    await waitForSaveComplete();

                    state.successCount++;
                    const successEl = document.getElementById('successCount');
                    if (successEl) successEl.textContent = state.successCount;

                    if (state.currentIndex < state.total) {
                        updateStatus(`➕ Criando novo formulário...`);
                        click('button[aria-label="Novo"]');
                        await sleep(1000);
                    }

                    console.log(`✅ Item ${state.currentIndex}/${state.total} concluído!`);
                } catch (error) {
                    state.errorCount++;
                    const errorEl = document.getElementById('errorCount');
                    if (errorEl) errorEl.textContent = state.errorCount;

                    if (error.response && error.response.message.includes('Too Many Attemps')) {
                        updateStatus(`⏳ Rate limit - aguardando 20s...`);
                        await sleep(20000);

                        updateStatus(`💾 Salvando item ${state.currentIndex}/${state.total}...`);
                        click('#acao-form button[aria-label="Salvar"]');
                        await waitForSaveComplete();

                        state.successCount++;
                        const successEl = document.getElementById('successCount');
                        if (successEl) successEl.textContent = state.successCount;

                        if (state.currentIndex < state.total) {
                            updateStatus(`➕ Criando novo formulário...`);
                            click('button[aria-label="Novo"]');
                            await sleep(1000);
                        }
                    }

                    console.error(`❌ Erro no item ${state.currentIndex}:`, error);
                }
            }

            if (state.stopped) {
                updateStatus(`⏹️ Script parado - ${state.successCount} sucessos, ${state.errorCount} erros`);
            } else {
                updateStatus(`✅ Concluído! ${state.successCount} sucessos, ${state.errorCount} erros`);
            }
        } catch (error) {
            console.error('❌ Erro fatal:', error);
            updateStatus(`❌ Erro fatal: ${error.message}`);
        }
    };

})();
