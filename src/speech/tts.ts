/**
 * Síntese de voz do navegador (Web Speech API). Opcional: quem usa leitor de tela
 * normalmente prefere ouvir pelo próprio leitor. Nada é enviado pelo aplicativo;
 * a voz usada é a instalada no sistema/navegador.
 */
export class Voz {
  private vozes: SpeechSynthesisVoice[] = [];
  velocidade = 1;
  vozPreferida = '';

  constructor(private readonly aoMudarVozes?: () => void) {
    if (!Voz.disponivel()) return;
    this.vozes = speechSynthesis.getVoices();
    // O callback só é chamado quando o navegador avisa que as vozes mudaram,
    // nunca durante a construção (quem cria a instância pode ainda não estar pronto).
    speechSynthesis.addEventListener?.('voiceschanged', () => {
      this.vozes = speechSynthesis.getVoices();
      this.aoMudarVozes?.();
    });
  }

  static disponivel(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  /** Vozes em português, com as do Brasil primeiro. */
  vozesPortugues(): SpeechSynthesisVoice[] {
    return this.vozes
      .filter((v) => v.lang.toLowerCase().startsWith('pt'))
      .sort((a, b) => Number(b.lang.toLowerCase() === 'pt-br') - Number(a.lang.toLowerCase() === 'pt-br'));
  }

  falar(texto: string): void {
    if (!Voz.disponivel()) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.rate = this.velocidade;
    const escolhida =
      this.vozes.find((v) => v.voiceURI === this.vozPreferida) ?? this.vozesPortugues()[0];
    if (escolhida) u.voice = escolhida;
    speechSynthesis.speak(u);
  }

  parar(): void {
    if (Voz.disponivel()) speechSynthesis.cancel();
  }

  falando(): boolean {
    return Voz.disponivel() && speechSynthesis.speaking;
  }
}
