import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/* #region logica-pura (recortada por scripts/jsonFieldViewer.regression.js)

   Nada aqui pode depender de imports, do DOM ou de `this`: o harness de
   regressao executa este trecho isolado em vm.runInNewContext. */

const ESTADO_OK = 'ok';
const ESTADO_VAZIO = 'vazio';
const ESTADO_INVALIDO = 'invalido';

/* Long Text Area vai a 131.072 caracteres. Sem teto, um payload desses vira
   milhares de linhas de DOM e trava a aba. */
const LIMITE_NOS = 3000;
const LIMITE_PROFUNDIDADE = 15;
const RECUO_POR_NIVEL = 1.25;

function tipoDe(valor) {
    if (valor === null) {
        return 'null';
    }
    if (Array.isArray(valor)) {
        return 'array';
    }
    return typeof valor;
}

function ehContainer(tipo) {
    return tipo === 'object' || tipo === 'array';
}

/**
 * Devolve o objeto/array embutido numa string escapada, ou null quando o valor
 * e mesmo texto. So tenta o parse quando o texto abre em { ou [ - sem essa
 * guarda, "2027" viraria numero e todo endereco pagaria um try/catch a toa.
 */
function comoJsonAninhado(valor) {
    if (typeof valor !== 'string') {
        return null;
    }
    const texto = valor.trim();
    if (texto.charAt(0) !== '{' && texto.charAt(0) !== '[') {
        return null;
    }
    try {
        const analisado = JSON.parse(texto);
        return analisado !== null && typeof analisado === 'object' ? analisado : null;
    } catch (erro) {
        return null;
    }
}

const ENTIDADES_NOMEADAS = {
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' ',
    amp: '&'
};

/* Uma passada so, senao &amp;quot; (um & literal no dado) viraria aspas e
   quebraria o JSON. O ramo numerico cobre &#92; (barra invertida), que e o que
   segura o JSON escapado dentro de string. */
function decodificarEntidades(texto) {
    return texto.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(quot|apos|lt|gt|nbsp|amp));/g, (inteira, decimal, hexadecimal, nome) => {
        if (decimal !== undefined) {
            return String.fromCodePoint(Number(decimal));
        }
        if (hexadecimal !== undefined) {
            return String.fromCodePoint(parseInt(hexadecimal, 16));
        }
        return ENTIDADES_NOMEADAS[nome];
    });
}

function ehJsonValido(texto) {
    try {
        JSON.parse(texto);
        return true;
    } catch (erro) {
        return false;
    }
}

/**
 * O UI API devolve Long Text Area com HTML escapado: no apsen_preprod o
 * EventPayload__c do LOG-00203 tem 1115 caracteres via SOQL e 2051 via
 * /ui-api/records, com toda aspa em &quot; e toda barra invertida em &#92;.
 * Como o LWC le pelo LDS, o texto precisa voltar ao original antes do parse.
 *
 * Decodifica so quando o texto cru falha e o decodificado funciona: conteudo
 * que ja e JSON valido nunca e alterado.
 */
function normalizarTexto(bruto) {
    if (bruto === null || bruto === undefined) {
        return '';
    }
    const texto = String(bruto);
    if (ehJsonValido(texto)) {
        return texto;
    }
    const decodificado = decodificarEntidades(texto);
    return ehJsonValido(decodificado) ? decodificado : texto;
}

function entradasDe(valor, tipo) {
    return tipo === 'array'
        ? valor.map((item, indice) => [String(indice), item])
        : Object.keys(valor).map((chave) => [chave, valor[chave]]);
}

function resumoDe(valor, tipo) {
    const quantidade = tipo === 'array' ? valor.length : Object.keys(valor).length;
    return tipo === 'array' ? `[ ${quantidade} ]` : `{ ${quantidade} }`;
}

function textoDoValor(valor, tipo) {
    return tipo === 'string' ? valor : String(valor);
}

/**
 * Converte o texto do campo numa lista achatada de nos, em ordem de exibicao.
 * Achatar em vez de aninhar e obrigatorio: um componente LWC nao pode se
 * referenciar no proprio template, entao nao ha recursao de markup.
 *
 * @param {string} textoBruto conteudo do campo
 * @param {{limiteNos?: number, limiteProfundidade?: number}} opcoes tetos de guarda
 * @returns {{estado: string, nos: object[], truncado: boolean}}
 */
function montarNos(textoBruto, opcoes) {
    const limiteNos = (opcoes && opcoes.limiteNos) || LIMITE_NOS;
    const limiteProfundidade = (opcoes && opcoes.limiteProfundidade) || LIMITE_PROFUNDIDADE;

    if (textoBruto === null || textoBruto === undefined || String(textoBruto).trim() === '') {
        return { estado: ESTADO_VAZIO, nos: [], truncado: false };
    }

    let raiz;
    try {
        raiz = JSON.parse(textoBruto);
    } catch (erro) {
        return { estado: ESTADO_INVALIDO, nos: [], truncado: false };
    }

    const nos = [];
    const controle = { sequencia: 0, truncado: false };

    function adicionar(chave, valor, profundidade, idPai) {
        if (nos.length >= limiteNos) {
            controle.truncado = true;
            return;
        }

        const aninhado = comoJsonAninhado(valor);
        const efetivo = aninhado === null ? valor : aninhado;
        const tipo = tipoDe(efetivo);
        const container = ehContainer(tipo);
        const podeDescer = profundidade + 1 < limiteProfundidade;
        const filhos = container && podeDescer ? entradasDe(efetivo, tipo) : [];

        // Cortar por profundidade esconde dado: precisa avisar na tela.
        if (container && !podeDescer && entradasDe(efetivo, tipo).length > 0) {
            controle.truncado = true;
        }

        const id = `no-${controle.sequencia++}`;
        nos.push({
            id,
            idPai: idPai === undefined ? null : idPai,
            chave,
            profundidade,
            tipo,
            temFilhos: filhos.length > 0,
            veioDeString: aninhado !== null,
            valor: container ? resumoDe(efetivo, tipo) : textoDoValor(efetivo, tipo)
        });

        filhos.forEach((entrada) => adicionar(entrada[0], entrada[1], profundidade + 1, id));
    }

    const tipoRaiz = tipoDe(raiz);
    if (ehContainer(tipoRaiz)) {
        entradasDe(raiz, tipoRaiz).forEach((entrada) => adicionar(entrada[0], entrada[1], 0, null));
    } else {
        adicionar(null, raiz, 0, null);
    }

    return { estado: ESTADO_OK, nos, truncado: controle.truncado };
}

/**
 * Mantem os nos cujos ancestrais estao todos abertos e decora cada um com o que
 * o template precisa pronto (recuo, icone, classe), ja que markup LWC nao chama
 * funcao.
 */
function montarLinhas(nos, abertos) {
    const renderizado = {};
    const linhas = [];

    nos.forEach((no) => {
        const visivel = no.idPai === null || (renderizado[no.idPai] === true && abertos[no.idPai] === true);
        renderizado[no.id] = visivel;
        if (!visivel) {
            return;
        }

        const aberto = abertos[no.id] === true;
        linhas.push({
            ...no,
            aberto,
            rotuloChave: no.chave === null ? '' : `${no.chave}:`,
            estilo: `padding-inline-start: ${no.profundidade * RECUO_POR_NIVEL}rem`,
            icone: no.temFilhos ? (aberto ? 'utility:chevrondown' : 'utility:chevronright') : null,
            rotuloBotao: no.temFilhos ? `${aberto ? 'Recolher' : 'Expandir'} ${no.chave}` : null,
            classeValor: `c-json-valor c-json-valor--${no.tipo}`
        });
    });

    return linhas;
}

function abrirTodos(nos) {
    const abertos = {};
    nos.forEach((no) => {
        if (no.temFilhos) {
            abertos[no.id] = true;
        }
    });
    return abertos;
}

function alternarAberto(abertos, id) {
    const proximo = { ...abertos };
    if (proximo[id]) {
        delete proximo[id];
    } else {
        proximo[id] = true;
    }
    return proximo;
}

/** Texto do campo indentado; conteudo que nao e JSON volta como veio. */
function textoFormatado(textoBruto) {
    if (textoBruto === null || textoBruto === undefined) {
        return '';
    }
    try {
        return JSON.stringify(JSON.parse(textoBruto), null, 4);
    } catch (erro) {
        return String(textoBruto);
    }
}

/* #endregion logica-pura */

/**
 * Renderiza o conteudo de um campo de texto como arvore JSON navegavel.
 * Generico de proposito: recebe o campo por configuracao e nao conhece objeto
 * nenhum. No MuleEventQueue__c serve EventPayload__c e ReturnedPayload__c.
 */
export default class JsonFieldViewer extends LightningElement {
    /** Preenchidos pela record page. */
    @api recordId;
    @api objectApiName;

    /** API Name do campo a exibir, definido no Lightning App Builder. */
    @api fieldName;
    /** Titulo do card; em branco, cai no proprio fieldName. */
    @api titulo;

    nos = [];
    abertos = {};
    estado = ESTADO_VAZIO;
    truncado = false;
    /** Conteudo do campo ja desescapado do HTML que o UI API aplica. */
    texto = '';
    erro;
    carregando = true;
    modoTexto = false;

    get camposSolicitados() {
        return this.objectApiName && this.fieldName ? [`${this.objectApiName}.${this.fieldName}`] : undefined;
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$camposSolicitados' })
    receberRegistro({ data, error }) {
        if (error) {
            this.carregando = false;
            this.erro = this.mensagemDeErro(error);
            return;
        }
        if (!data) {
            return;
        }

        this.carregando = false;
        this.erro = undefined;
        this.texto = normalizarTexto(getFieldValue(data, `${this.objectApiName}.${this.fieldName}`));

        const resultado = montarNos(this.texto);
        this.estado = resultado.estado;
        this.nos = resultado.nos;
        this.truncado = resultado.truncado;
        this.abertos = abrirTodos(this.nos);
    }

    /* ------------------------------------------------------------- Getters */

    get tituloExibido() {
        return this.titulo || this.fieldName || 'JSON';
    }

    get semConfiguracao() {
        return !this.fieldName;
    }

    get vazio() {
        return this.estado === ESTADO_VAZIO;
    }

    get jsonInvalido() {
        return this.estado === ESTADO_INVALIDO;
    }

    get mostrarTexto() {
        return this.modoTexto || this.jsonInvalido;
    }

    get linhas() {
        return montarLinhas(this.nos, this.abertos);
    }

    get textoParaExibir() {
        return textoFormatado(this.texto);
    }

    get rotuloModo() {
        return this.modoTexto ? 'Ver árvore' : 'Ver texto';
    }

    get semConteudo() {
        return this.carregando || !!this.erro || this.vazio;
    }

    get acoesDesabilitadas() {
        return this.semConteudo || this.mostrarTexto;
    }

    get avisoTruncado() {
        return (
            `Conteúdo grande: a exibição foi cortada em ${LIMITE_NOS} linhas ou ${LIMITE_PROFUNDIDADE} níveis. ` +
            'Use "Ver texto" para o conteúdo completo.'
        );
    }

    /* --------------------------------------------------------------- Acoes */

    expandirTudo() {
        this.abertos = abrirTodos(this.nos);
    }

    recolherTudo() {
        this.abertos = {};
    }

    alternarNo(evento) {
        this.abertos = alternarAberto(this.abertos, evento.currentTarget.dataset.id);
    }

    alternarModo() {
        this.modoTexto = !this.modoTexto;
    }

    async copiar() {
        try {
            await navigator.clipboard.writeText(this.textoParaExibir);
            this.avisar('JSON copiado para a área de transferência.', 'success');
        } catch (erro) {
            this.avisar('O navegador bloqueou a cópia. Use "Ver texto" e copie manualmente.', 'warning');
        }
    }

    /* --------------------------------------------------------------- Apoio */

    avisar(mensagem, variante) {
        this.dispatchEvent(new ShowToastEvent({ message: mensagem, variant: variante }));
    }

    mensagemDeErro(erro) {
        const corpo = erro && erro.body;
        if (Array.isArray(corpo)) {
            return corpo.map((item) => item.message).join(', ');
        }
        if (corpo && corpo.message) {
            return corpo.message;
        }
        return `Não foi possível ler ${this.fieldName}. Verifique o API Name do campo e as permissões.`;
    }
}
