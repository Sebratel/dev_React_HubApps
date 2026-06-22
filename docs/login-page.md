# LoginPage — Documentação técnica

**Arquivo:** `src/features/auth/LoginPage.tsx`
**Stack:** React 18 + TypeScript + Tailwind CSS + Vite
**Design system:** GER/Sebratel (DM Sans, `#FFB000` âmbar, `#F5F1E8` fundo, sem azul, sem dark mode, sem gradientes decorativos)

---

## 1. Visão geral da estrutura

A tela é dividida em **três faixas horizontais** dentro de um flex container full-screen:

```
┌──────────────────────────────┬──┬─────────────────┐
│  PAINEL ESQUERDO (flex-1)    │░░│ PAINEL DIREITO  │
│  Imagem + overlays + texto   │  │ (w-[35%])       │
│                              │  │ Formulário      │
└──────────────────────────────┴──┴─────────────────┘
                               ↑
                        Faixa divisória
                        âmbar (w-1.5)
```

**Container raiz:**
```tsx
<div className="h-screen w-screen flex overflow-hidden">
```

- `h-screen w-screen` — ocupa exatamente 100% da viewport, sem scroll no body.
- `overflow-hidden` — impede que a animação Ken Burns cause overflow.
- `flex` — os três filhos diretos se alinham horizontalmente.

---

## 2. Painel esquerdo — imagem e decoração

```tsx
<div className="hidden lg:flex relative flex-col justify-end flex-1 overflow-hidden bg-[#0d0a06]">
```

- `hidden lg:flex` — **só aparece em ≥ 1024px**. Em mobile o painel não existe; o formulário ocupa a tela toda.
- `flex-1` — expande para preencher todo o espaço restante após a faixa divisória e o painel direito.
- `overflow-hidden` — necessário para conter o efeito Ken Burns sem vazar.
- `bg-[#0d0a06]` — cor de fallback caso a imagem não carregue.
- `justify-end` — empurra o conteúdo de texto para a parte inferior.

### 2.1 Imagem de fundo

```tsx
<img
  src="/login-cover.png"
  alt=""
  aria-hidden
  draggable={false}
  className="absolute inset-0 w-full h-full object-cover object-center opacity-60 animate-ken-burns"
/>
```

- **`/login-cover.png`** — imagem em `/public`. Formato recomendado: JPG ou WebP, mínimo 1920×1080px, orientação landscape.
- `opacity-60` — controle de brilho da imagem. Intervalo seguro: `opacity-50` (mais escuro) a `opacity-75` (mais claro).
- `animate-ken-burns` — classe de animação definida em `src/styles/globals.css` (ver seção 6).

### 2.2 Overlays empilhados

São dois `<div>` absolutos posicionados sobre a imagem, em ordem de renderização:

**Overlay 1 — gradiente âmbar diagonal (atmosfera de marca):**
```tsx
<div className="absolute inset-0 bg-gradient-to-br from-[#2d1800]/60 via-transparent to-[#0d0a06]/40" />
```
Cria uma camada de "esquentamento" de cor, alinhada ao visual âmbar da marca Sebratel.

**Overlay 2 — scrim escuro inferior (legibilidade do texto):**
```tsx
<div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
```
- `h-52` (208px) — altura da faixa escura.
- `from-black/70` — opacidade máxima de 70% na borda inferior.
- Sempre deve ser o último overlay antes dos ícones e do texto, para garantir contraste.

### 2.3 Ícones hexagonais flutuantes

Componente local `HexIcon` renderiza um hexágono SVG outline + ícone centralizado:

```tsx
function HexIcon({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none" style={style} aria-hidden>
      <svg width="64" height="72" viewBox="0 0 64 72">
        <polygon
          points="32,2 62,18 62,54 32,70 2,54 2,18"
          fill="none"
          stroke="rgba(255,176,0,0.45)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[#FFB000]/60">
        {children}
      </div>
    </div>
  )
}
```

- Stroke: `rgba(255,176,0,0.45)` — âmbar com 45% de opacidade.
- Ícone interno: `text-[#FFB000]/60` — âmbar com 60% de opacidade.
- `pointer-events-none` — decorativo, não interfere com interações.
- `aria-hidden` — ignorado por leitores de tela.
- Posicionamento via prop `style` (inline): `{ top: '10%', left: '10%' }`.

**Posicionamento atual dos 6 ícones:**

| Ícone       | `top`  | `left` / `right` |
|-------------|--------|------------------|
| IconBolt    | 10%    | left: 10%        |
| IconCloud   | 8%     | left: 38%        |
| IconUsers   | 14%    | right: 12%       |
| IconBattery | 38%    | left: 5%         |
| IconWifi    | 42%    | right: 8%        |
| IconBarChart| bottom: 32% | left: 28%   |

**Ícones disponíveis:** todos são SVG inline com `stroke="currentColor"`, `strokeWidth="1.8"`, `22×22px`. São: `IconBolt`, `IconCloud`, `IconBattery`, `IconUsers`, `IconWifi`, `IconBarChart`.

Para adicionar um novo ícone, declare um componente SVG seguindo o mesmo padrão e adicione um `<HexIcon>` com o posicionamento desejado.

### 2.4 Texto inferior (badge + tagline)

```tsx
<div className="relative z-10 px-12 py-10">
  <div className="flex items-center gap-2 mb-5">
    <img src="/logo-circular-sebratel.png" alt="Sebratel" className="w-10 h-10 opacity-90" draggable={false} />
    <span className="text-xs font-bold tracking-[0.18em] text-white/70 uppercase">Sebratel Hub</span>
  </div>
  <h1 className="text-[2.4rem] font-black text-white leading-[1.15] tracking-tight">
    A conexão que<br />
    move{' '}
    <span className="text-[#FFB000]">o que importa.</span>
  </h1>
  <p className="mt-3 text-sm text-white/50 font-medium leading-relaxed max-w-sm">
    Tecnologia e pessoas conectadas para levar o melhor todos os dias.
  </p>
</div>
```

- `z-10` — garante que o texto fique acima dos overlays.
- Logo: `w-10 h-10` (40px). Arquivo em `/public/logo-circular-sebratel.png`.
- Tagline em `text-[2.4rem]` com a palavra-chave em `text-[#FFB000]`.

---

## 3. Faixa divisória âmbar

```tsx
<div className="hidden lg:block w-1.5 shrink-0 bg-[#FFB000] z-10" aria-hidden />
```

- `w-1.5` (6px) — largura fixa da faixa.
- `shrink-0` — não encolhe independente do espaço disponível.
- `hidden lg:block` — só aparece em ≥ 1024px (junto com o painel esquerdo).
- `bg-[#FFB000]` — cor primária do design system Sebratel.
- `aria-hidden` — elemento puramente decorativo.

---

## 4. Painel direito — formulário

```tsx
<div className="w-[35%] shrink-0 flex flex-col bg-[#f7f4ee] overflow-y-auto">
```

- `w-[35%]` — largura fixa de 35% da tela. Em mobile este painel ocupa 100% (o painel esquerdo está oculto).
- `bg-[#f7f4ee]` — fundo creme do design system GER/Sebratel.
- `overflow-y-auto` — permite scroll vertical se o conteúdo crescer (ex: formulário e-mail expandido).

### 4.1 Container do formulário

```tsx
<div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
  <div className="w-full max-w-[340px] flex flex-col gap-6">
    {/* conteúdo */}
  </div>
</div>
```

- `max-w-[340px]` — largura máxima do bloco de formulário. Ajuste se precisar de mais espaço.
- `gap-6` (24px) — espaçamento vertical entre os blocos de conteúdo.

### 4.2 Elementos do formulário (em ordem)

| Elemento | Descrição |
|----------|-----------|
| Badge `SEBRATEL HUB` | Pill âmbar com `bg-primary/15`, texto `text-primary`, rastreamento largo |
| Título `Acessar plataforma` | `text-2xl font-black text-[#1a0f00]` |
| Subtítulo | `text-sm text-[#7a6a55]` |
| Info de domínio | Card branco com borda `#e0d8c8`, ícone `Lock` da lucide-react |
| Botão Google | `bg-primary h-12 rounded-xl`, ícone Google SVG inline multicolor |
| Divisor `ou` | Linha `h-px bg-[#d8cfc0]` + texto `text-[#a0917d]` |
| "Problemas para acessar?" | Botão toggle que expande o formulário de e-mail |
| Formulário e-mail | Oculto por padrão, animado com `animate-in fade-in slide-in-from-top-2` |
| Rodapé | `© {ano} Sebratel · Uso interno`, `text-[10px] text-[#a0917d]` |

### 4.3 Formulário de e-mail (expansível)

Controlado pelo estado `showEmail: boolean`. Quando `true`, renderiza:

```tsx
<form onSubmit={handleEmailSignIn} className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
  <Input type="email" ... />
  <Input type="password" ... />
  <button onClick={handlePasswordReset}>Esqueci minha senha</button>
  <Button type="submit">Entrar</Button>
</form>
```

O estado do reset de senha é um `'idle' | 'sending' | 'sent'` — o botão reflete o estado atual.

---

## 5. Gerenciamento de estado

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `email` | `string` | Valor do campo de e-mail |
| `password` | `string` | Valor do campo de senha |
| `isLoading` | `boolean` | Bloqueia UI durante requisição |
| `error` | `string \| null` | Erro local da tela |
| `showEmail` | `boolean` | Controla visibilidade do formulário de e-mail |
| `resetState` | `'idle' \| 'sending' \| 'sent'` | Estado do envio de reset de senha |
| `resetError` | `string \| null` | Erro específico do reset |
| `authError` | via `useAuthStore` | Erro global de autenticação do store Zustand |

`displayError = error ?? authError` — exibe o erro local com prioridade sobre o global.

---

## 6. Animação Ken Burns

Definida em `src/styles/globals.css`:

```css
@keyframes ken-burns {
  0%   { transform: scale(1)    translate(0, 0); }
  50%  { transform: scale(1.03) translate(-0.5%, 0.5%); }
  100% { transform: scale(1)    translate(0, 0); }
}
.animate-ken-burns {
  animation: ken-burns 24s ease-in-out infinite;
  transform-origin: center center;
}
```

- Zoom máximo: `scale(1.03)` — 3% de expansão, suficiente para dar movimento sem distorcer.
- Ciclo: `24s` — lento o suficiente para ser imperceptível ao usuário casual.
- `transform-origin: center center` — o zoom parte do centro da imagem.
- Aplicada via classe `animate-ken-burns` diretamente na tag `<img>`.

> **Atenção:** o container pai deve ter `overflow-hidden` para que o zoom não vaze para fora dos limites.

---

## 7. Fluxo de autenticação

```
handleGoogleSignIn()
  └─ signInWithGoogle()            → src/services/auth.service.ts
       ├─ success → navigate(from) → rota de origem ou '/'
       └─ error   → setError(msg)

handleEmailSignIn(e)
  └─ signInWithEmailAndPassword()  → src/services/auth.service.ts
       ├─ success → navigate(from)
       └─ error   → setError(msg)

handlePasswordReset()
  └─ sendPasswordResetEmail(email) → src/services/auth.service.ts
       ├─ success → setResetState('sent')
       └─ error   → setResetState('idle') + setResetError(msg)
```

**Redirecionamento pós-login:**
```ts
const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
navigate(from, { replace: true })
```
O React Router preserva a rota que o usuário tentou acessar antes do redirect para o login. Após autenticar, ele é enviado para `from`.

---

## 8. Restrições de segurança (ADR — não violar)

| Regra | Detalhe |
|-------|---------|
| **ADR-0001-D7** | JWT/tokens são gerados **exclusivamente no servidor**. O frontend nunca chama `jwt.sign()`, não usa HMAC e não tem acesso a chaves privadas. |
| **ADR-0001-D3** | `isAdmin`, `permissions` e `profile` **nunca são gravados no `localStorage`**. O `useAuthStore` (Zustand) não usa `persist` middleware. |
| **Proibido** | Variáveis `VITE_JWT_SECRET`, `VITE_PRIVATE_KEY` ou `VITE_SERVICE_ACCOUNT_KEY` no frontend. |

---

## 9. Assets necessários em `/public`

| Arquivo | Uso | Especificações |
|---------|-----|----------------|
| `login-cover.png` | Imagem de fundo do painel esquerdo | ≥ 1920×1080px, landscape, JPG ou WebP |
| `logo-circular-sebratel.png` | Logo no canto inferior esquerdo | PNG com transparência, mínimo 80×80px |

---

## 10. Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `< 1024px` (mobile/tablet) | Painel esquerdo e faixa divisória ficam ocultos (`hidden`). O painel direito ocupa 100% da tela. |
| `≥ 1024px` (desktop) | Layout de três colunas: imagem (`flex-1`) + faixa (`w-1.5`) + formulário (`w-[35%]`). |

---

## 11. Tokens de cor utilizados

| Token | Valor | Uso |
|-------|-------|-----|
| `#FFB000` | Âmbar primário | Botão Google, faixa divisória, destaques, ícones hex |
| `#f7f4ee` | Fundo creme | Painel direito |
| `#1a0f00` | Marrom escuro | Títulos, textos fortes |
| `#7a6a55` | Marrom médio | Subtítulos, labels |
| `#a0917d` | Marrom claro | Textos terciários, rodapé |
| `#e0d8c8` | Borda creme | Bordas do card de domínio |
| `#d8cfc0` | Divisor | Linha horizontal `ou` |
| `#0d0a06` | Quase preto | Background fallback painel esquerdo |
| `#2d1800` | Marrom muito escuro | Gradiente overlay âmbar |

---

## 12. Como modificar esta tela

### Trocar a imagem de fundo
Substitua `/public/login-cover.png`. A classe `object-cover object-center` garante que qualquer imagem landscape preencha o painel sem distorção.

### Ajustar brilho da imagem
Altere `opacity-{valor}` na tag `<img>` do painel esquerdo. Valores recomendados: `50` a `75`.

### Ajustar velocidade da animação
No CSS: altere `24s` para um valor menor (mais rápido) ou maior (mais lento).

### Ajustar largura do painel do formulário
Altere `w-[35%]` no painel direito. Valores testados: `30%` (mais estreito) a `42%` (mais largo). O painel esquerdo com `flex-1` ajusta automaticamente.

### Adicionar novo método de login
Adicione um handler seguindo o padrão de `handleGoogleSignIn`: setar `isLoading`, chamar o serviço de `auth.service.ts`, tratar sucesso com `navigate(from)` e erro com `setError`.

### Alterar a tagline
Edite o `<h1>` dentro do bloco `{/* Texto inferior */}`. Mantenha a última palavra ou frase em `<span className="text-[#FFB000]">` para preservar o padrão de destaque âmbar.
