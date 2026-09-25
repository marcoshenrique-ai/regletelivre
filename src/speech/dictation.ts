/**
 * Ditado por voz (Web Speech API — SpeechRecognition).
 *
 * PRIVACIDADE: em vários navegadores o reconhecimento é feito em servidores da
 * empresa do navegador, e não no aparelho. Por isso:
 *  - se o navegador oferece reconhecimento local (`processLocally`) para pt-BR,
 *    usamos esse modo;
 *  - caso contrário, o ditado só é habilitado se a pessoa marcar explicitamente
 *    a opção nas Configurações, com o aviso de que o áudio pode sair do aparelho.
 * O ditado nunca é necessário: digitar o texto sempre funciona.
 */

interface ResultadoReconhecimento {
  readonly transcript: string;
}
interface EventoResultado {
  readonly results: ArrayLike<ArrayLike<ResultadoReconhecimento> & { isFinal: boolean }>;
}
interface EventoErro {
  readonly error: string;
}
interface Reconhecedor {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: EventoErro) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface ConstrutorReconhecedor {
  new (): Reconhecedor;
  available?: (opts: { langs: string[]; processLocally: boolean }) => Promise<string>;
}

export type SuporteDitado = 'indisponivel' | 'local' | 'remoto';

function construtor(): ConstrutorReconhecedor | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as ConstrutorReconhecedor | undefined;
}

export async function detectarSuporte(): Promise<SuporteDitado> {
  const C = construtor();
  if (!C) return 'indisponivel';
  try {
    if (typeof C.available === 'function' && 'processLocally' in C.prototype) {
      const estado = await C.available({ langs: ['pt-BR'], processLocally: true });
      if (estado === 'available') return 'local';
    }
  } catch {
    // API experimental: ignora e trata como remoto.
  }
  return 'remoto';
}

export interface CallbacksDitado {
  aoReconhecer: (texto: string) => void;
  aoErro: (mensagem: string) => void;
  aoTerminar: () => void;
}

export class Ditado {
  private rec: Reconhecedor | null = null;

  constructor(private readonly suporte: SuporteDitado) {}

  get ativo(): boolean {
    return this.rec !== null;
  }

  iniciar(cb: CallbacksDitado): void {
    const C = construtor();
    if (!C || this.suporte === 'indisponivel') {
      cb.aoErro('Ditado não disponível neste navegador. Digite o texto.');
      return;
    }
    const rec = new C();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    if (this.suporte === 'local') rec.processLocally = true;
    rec.onresult = (e) => {
      const partes: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r && r.isFinal && r[0]) partes.push(r[0].transcript);
      }
      const texto = partes.join(' ').trim();
      if (texto) cb.aoReconhecer(texto);
    };
    rec.onerror = (e) => cb.aoErro(mensagemDeErro(e.error));
    rec.onend = () => {
      this.rec = null;
      cb.aoTerminar();
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      this.rec = null;
      cb.aoErro('Não foi possível iniciar o ditado.');
      cb.aoTerminar();
    }
  }

  parar(): void {
    this.rec?.stop();
  }
}

function mensagemDeErro(codigo: string): string {
  switch (codigo) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O navegador não permitiu usar o microfone. Verifique a permissão ou digite o texto.';
    case 'no-speech':
      return 'Nenhuma fala detectada. Tente de novo ou digite o texto.';
    case 'network':
      return 'O ditado deste navegador precisa de internet. Digite o texto.';
    case 'language-not-supported':
      return 'O ditado em português não está disponível neste navegador.';
    case 'aborted':
      return 'Ditado interrompido.';
    default:
      return 'Erro no ditado. Digite o texto.';
  }
}
