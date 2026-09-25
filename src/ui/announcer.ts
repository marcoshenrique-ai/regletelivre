import type { Voz } from '../speech/tts';
import type { Saida } from './settings';

/**
 * Anunciador central. Encaminha as mensagens para o leitor de tela (região
 * aria-live educada), para a voz do aplicativo, ou para ambos, conforme a
 * configuração — assim a mesma frase não é falada duas vezes sem que a pessoa queira.
 */
export class Anunciador {
  private timer: number | undefined;

  constructor(
    private readonly regiao: HTMLElement,
    private readonly voz: Voz,
    public saida: Saida,
  ) {}

  anunciar(texto: string): void {
    if (this.saida === 'leitor' || this.saida === 'ambos') this.paraLeitor(texto);
    if (this.saida === 'voz' || this.saida === 'ambos') this.voz.falar(texto);
  }

  /** Limpa e reescreve a região ao vivo para que a mesma frase seja lida de novo (ex.: "Repetir"). */
  private paraLeitor(texto: string): void {
    window.clearTimeout(this.timer);
    this.regiao.textContent = '';
    this.timer = window.setTimeout(() => {
      this.regiao.textContent = texto;
    }, 60);
  }

  pararVoz(): void {
    this.voz.parar();
  }
}
